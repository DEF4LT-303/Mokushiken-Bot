import { PermissionsBitField, ActivityType } from 'discord.js';
import { config } from '../config.js';
import {
  getAllMonitorConfigs,
  getMonitorConfig,
  setMonitorConfig,
  updateMessageId,
  removeMonitorConfig,
} from '../utils/storage.js';
import { getSystemStats } from './systemService.js';
import { buildMonitorEmbed } from './embedBuilder.js';
import { formatDuration } from '../utils/formatters.js';
import { logger } from '../utils/logger.js';

let intervalTimer = null;
let discordClient = null;
let isUpdating = false;
let presenceRotationIndex = 0;

/**
 * Updates the bot's Discord presence with live metrics and dynamic health status.
 */
export function updateBotPresence(stats) {
  if (!discordClient || !discordClient.user) return;

  const maxLoad = Math.max(stats.cpu.usagePercent, stats.memory.percent, stats.disk.percent);
  let status = 'online';
  if (maxLoad >= 90) {
    status = 'dnd';
  } else if (maxLoad >= 75) {
    status = 'idle';
  }

  const activities = [
    {
      name: `CPU: ${stats.cpu.usagePercent.toFixed(1)}% | RAM: ${stats.memory.percent.toFixed(1)}%`,
      type: ActivityType.Watching,
    },
    {
      name: `${stats.serverName} • Up ${formatDuration(stats.os.uptimeSeconds)}`,
      type: ActivityType.Watching,
    },
    {
      name: '/monitor • /status',
      type: ActivityType.Listening,
    },
  ];

  const currentActivity = activities[presenceRotationIndex % activities.length];
  presenceRotationIndex++;

  try {
    discordClient.user.setPresence({
      status,
      activities: [currentActivity],
    });
  } catch (err) {
    logger.warn('Failed to update bot presence:', err.message);
  }
}

/**
 * Searches for a previous monitor message in the channel.
 * First checks saved messageId, then inspects recent channel messages for bot embeds.
 */
async function findExistingMonitorMessage(channel, savedMessageId) {
  // 1. Check saved message ID first
  if (savedMessageId) {
    try {
      const msg = await channel.messages.fetch(savedMessageId);
      if (msg && msg.author.id === discordClient.user.id) {
        return msg;
      }
    } catch {
      // Message ID might be invalid or deleted, fallback to searching history
    }
  }

  // 2. Scan recent messages for an embed from this bot
  try {
    const messages = await channel.messages.fetch({ limit: 20 });
    const botEmbedMsg = messages.find(
      (m) =>
        m.author.id === discordClient.user.id &&
        m.embeds.length > 0 &&
        m.embeds[0].title?.startsWith('🖥️ VPS Monitor')
    );
    return botEmbedMsg || null;
  } catch (err) {
    logger.warn(`Could not fetch message history in #${channel.name}:`, err.message);
    return null;
  }
}

/**
 * Recovers or initializes a channel's monitor message on startup.
 * Deletes stale embed if present and posts a fresh embed at the bottom.
 */
async function setupChannelMessage(item, stats) {
  try {
    const channel = await discordClient.channels.fetch(item.channelId).catch(() => null);
    if (!channel || !channel.isTextBased()) {
      logger.warn(`Channel ${item.channelId} for guild ${item.guildId} not found or not text-based.`);
      return;
    }

    const permissions = channel.permissionsFor(discordClient.user);
    if (
      !permissions ||
      !permissions.has(PermissionsBitField.Flags.ViewChannel) ||
      !permissions.has(PermissionsBitField.Flags.SendMessages) ||
      !permissions.has(PermissionsBitField.Flags.EmbedLinks)
    ) {
      logger.warn(`Missing permissions in channel #${channel.name} (${channel.id}).`);
      return;
    }

    // Check for prior message
    const existingMsg = await findExistingMonitorMessage(channel, item.messageId);
    if (existingMsg) {
      try {
        await existingMsg.delete();
        logger.monitor(`Cleaned up previous monitor embed (${existingMsg.id}) in #${channel.name}.`);
      } catch (err) {
        logger.warn(`Could not delete old monitor message:`, err.message);
      }
    }

    // Post fresh embed at bottom
    const avatarUrl = discordClient?.user?.displayAvatarURL?.({ extension: 'png', size: 256 }) || null;
    const embed = buildMonitorEmbed(stats, discordClient?.ws?.ping, avatarUrl);
    const newMsg = await channel.send({ embeds: [embed] });
    updateMessageId(item.guildId, newMsg.id);
    logger.monitor(`Live monitor posted in #${channel.name} (${newMsg.id}).`);
  } catch (err) {
    logger.error(`Failed setting up monitor in guild ${item.guildId}:`, err.message);
  }
}

/**
 * Updates a registered channel's monitor embed in-place.
 */
async function updateChannelEmbed(item, stats, embed) {
  try {
    const channel = await discordClient.channels.fetch(item.channelId).catch(() => null);
    if (!channel || !channel.isTextBased()) return;

    if (!item.messageId) {
      // If no message tracked, send fresh message
      const newMsg = await channel.send({ embeds: [embed] });
      updateMessageId(item.guildId, newMsg.id);
      return;
    }

    try {
      const msg = await channel.messages.fetch(item.messageId);
      await msg.edit({ embeds: [embed] });
    } catch (err) {
      // If message was deleted (10008 Unknown Message), recreate it
      if (err.code === 10008 || err.message?.includes('Unknown Message')) {
        logger.monitor(`Tracked message ${item.messageId} missing in #${channel.name}, posting new embed.`);
        const newMsg = await channel.send({ embeds: [embed] });
        updateMessageId(item.guildId, newMsg.id);
      } else {
        logger.warn(`Failed editing message in #${channel.name}:`, err.message);
      }
    }
  } catch (err) {
    logger.error(`Error in update loop for guild ${item.guildId}:`, err.message);
  }
}

/**
 * Periodic tick executed every 30 seconds.
 */
async function runMonitorCycle() {
  if (isUpdating) return;
  isUpdating = true;

  try {
    const stats = await getSystemStats();
    updateBotPresence(stats);

    const configs = getAllMonitorConfigs();
    if (configs.length === 0) {
      return;
    }

    const avatarUrl = discordClient?.user?.displayAvatarURL?.({ extension: 'png', size: 256 }) || null;
    const embed = buildMonitorEmbed(stats, discordClient?.ws?.ping, avatarUrl);

    await Promise.allSettled(configs.map((item) => updateChannelEmbed(item, stats, embed)));
  } catch (err) {
    logger.error('Critical error in monitor cycle:', err);
  } finally {
    isUpdating = false;
  }
}

/**
 * Initializes the monitoring service with the Discord client.
 */
export async function initMonitorService(client) {
  discordClient = client;

  logger.monitor(`Initializing monitoring service (interval: ${config.checkInterval}s)...`);
  const initialStats = await getSystemStats();
  updateBotPresence(initialStats);

  const configs = getAllMonitorConfigs();
  if (configs.length > 0) {
    logger.monitor(`Performing startup recovery for ${configs.length} registered channel(s)...`);
    for (const item of configs) {
      await setupChannelMessage(item, initialStats);
    }
  }

  if (intervalTimer) {
    clearInterval(intervalTimer);
  }

  intervalTimer = setInterval(runMonitorCycle, config.checkInterval * 1000);
  logger.monitor('Background 30s monitoring loop started.');
}

/**
 * Registers a channel for monitoring.
 */
export async function registerChannel(guildId, channel) {
  const stats = await getSystemStats();
  const avatarUrl = discordClient?.user?.displayAvatarURL?.({ extension: 'png', size: 256 }) || null;
  const embed = buildMonitorEmbed(stats, discordClient?.ws?.ping, avatarUrl);

  // Check if channel already has an active monitor message
  const currentConfig = getMonitorConfig(guildId);
  if (currentConfig && currentConfig.messageId) {
    try {
      const oldMsg = await channel.messages.fetch(currentConfig.messageId);
      await oldMsg.delete().catch(() => {});
    } catch {
      // Ignored if not found
    }
  }

  const message = await channel.send({ embeds: [embed] });
  setMonitorConfig(guildId, {
    channelId: channel.id,
    messageId: message.id,
    enabled: true,
  });

  logger.monitor(`Channel registered: #${channel.name} (${channel.id}) in guild ${guildId}`);
  return message;
}

/**
 * Unregisters a channel from monitoring.
 */
export async function unregisterChannel(guildId, deleteMessage = false) {
  const currentConfig = getMonitorConfig(guildId);
  if (!currentConfig) return false;

  if (deleteMessage && currentConfig.messageId && discordClient) {
    try {
      const channel = await discordClient.channels.fetch(currentConfig.channelId);
      if (channel) {
        const msg = await channel.messages.fetch(currentConfig.messageId);
        await msg.delete().catch(() => {});
      }
    } catch {
      // Ignore deletion errors
    }
  }

  removeMonitorConfig(guildId);
  logger.monitor(`Channel unregistered for guild ${guildId}`);
  return true;
}

/**
 * Stops monitoring loop gracefully.
 */
export function stopMonitorService() {
  if (intervalTimer) {
    clearInterval(intervalTimer);
    intervalTimer = null;
  }
  logger.monitor('Monitoring service stopped.');
}
