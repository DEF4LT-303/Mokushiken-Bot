import { PermissionsBitField } from 'discord.js';
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

let intervalTimer = null;
let discordClient = null;
let isUpdating = false;

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
        m.embeds[0].title?.startsWith('🖥️ VPS Monitor:')
    );
    return botEmbedMsg || null;
  } catch (err) {
    console.warn(`[Monitor] Could not fetch message history in #${channel.name}:`, err.message);
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
      console.warn(`[Monitor] Channel ${item.channelId} for guild ${item.guildId} not found or not text-based.`);
      return;
    }

    const permissions = channel.permissionsFor(discordClient.user);
    if (
      !permissions ||
      !permissions.has(PermissionsBitField.Flags.ViewChannel) ||
      !permissions.has(PermissionsBitField.Flags.SendMessages) ||
      !permissions.has(PermissionsBitField.Flags.EmbedLinks)
    ) {
      console.warn(`[Monitor] Missing permissions in channel #${channel.name} (${channel.id}).`);
      return;
    }

    // Check for prior message
    const existingMsg = await findExistingMonitorMessage(channel, item.messageId);
    if (existingMsg) {
      try {
        await existingMsg.delete();
        console.log(`[Monitor] Cleaned up previous monitor embed (${existingMsg.id}) in #${channel.name}.`);
      } catch (err) {
        console.warn(`[Monitor] Could not delete old monitor message:`, err.message);
      }
    }

    // Post fresh embed at bottom
    const embed = buildMonitorEmbed(stats);
    const newMsg = await channel.send({ embeds: [embed] });
    updateMessageId(item.guildId, newMsg.id);
    console.log(`[Monitor] Live monitor posted in #${channel.name} (${newMsg.id}).`);
  } catch (err) {
    console.error(`[Monitor] Failed setting up monitor in guild ${item.guildId}:`, err.message);
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
        console.log(`[Monitor] Tracked message ${item.messageId} missing in #${channel.name}, posting new embed.`);
        const newMsg = await channel.send({ embeds: [embed] });
        updateMessageId(item.guildId, newMsg.id);
      } else {
        console.warn(`[Monitor] Failed editing message in #${channel.name}:`, err.message);
      }
    }
  } catch (err) {
    console.error(`[Monitor] Error in update loop for guild ${item.guildId}:`, err.message);
  }
}

/**
 * Periodic tick executed every 30 seconds.
 */
async function runMonitorCycle() {
  if (isUpdating) return;
  isUpdating = true;

  try {
    const configs = getAllMonitorConfigs();
    if (configs.length === 0) {
      return;
    }

    const stats = await getSystemStats();
    const embed = buildMonitorEmbed(stats);

    await Promise.allSettled(configs.map((item) => updateChannelEmbed(item, stats, embed)));
  } catch (err) {
    console.error('[Monitor] Critical error in monitor cycle:', err);
  } finally {
    isUpdating = false;
  }
}

/**
 * Initializes the monitoring service with the Discord client.
 */
export async function initMonitorService(client) {
  discordClient = client;

  console.log(`[Monitor] Initializing monitoring service (interval: ${config.checkInterval}s)...`);
  const configs = getAllMonitorConfigs();

  if (configs.length > 0) {
    console.log(`[Monitor] Performing startup recovery for ${configs.length} registered channel(s)...`);
    const initialStats = await getSystemStats();

    for (const item of configs) {
      await setupChannelMessage(item, initialStats);
    }
  }

  if (intervalTimer) {
    clearInterval(intervalTimer);
  }

  intervalTimer = setInterval(runMonitorCycle, config.checkInterval * 1000);
  console.log('[Monitor] Background 30s monitoring loop started.');
}

/**
 * Registers a channel for monitoring.
 */
export async function registerChannel(guildId, channel) {
  const stats = await getSystemStats();
  const embed = buildMonitorEmbed(stats);

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
  console.log('[Monitor] Monitoring service stopped.');
}
