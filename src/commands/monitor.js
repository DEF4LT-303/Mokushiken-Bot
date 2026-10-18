import {
  SlashCommandBuilder,
  PermissionFlagsBits,
  ChannelType,
  EmbedBuilder,
} from 'discord.js';
import { registerChannel, unregisterChannel } from '../services/monitorService.js';
import { getMonitorConfig } from '../utils/storage.js';
import { ensureServerOwner } from '../utils/permissions.js';
import { config } from '../config.js';

export const data = new SlashCommandBuilder()
  .setName('monitor')
  .setDescription('Manage the VPS real-time monitoring service (Server Owner only)')
  .setDefaultMemberPermissions(PermissionFlagsBits.Administrator)
  .addSubcommand((subcommand) =>
    subcommand
      .setName('setup')
      .setDescription('Select a channel for the live 30-second VPS status feed')
      .addChannelOption((option) =>
        option
          .setName('channel')
          .setDescription('Target text channel (defaults to current channel)')
          .addChannelTypes(ChannelType.GuildText)
          .setRequired(false)
      )
  )
  .addSubcommand((subcommand) =>
    subcommand
      .setName('stop')
      .setDescription('Stop live VPS monitoring in this server')
      .addBooleanOption((option) =>
        option
          .setName('delete_message')
          .setDescription('Whether to delete the existing live status embed message')
          .setRequired(false)
      )
  )
  .addSubcommand((subcommand) =>
    subcommand
      .setName('status')
      .setDescription('View the current monitoring configuration for this server')
  );

export async function execute(interaction) {
  if (!(await ensureServerOwner(interaction))) return;

  const subcommand = interaction.options.getSubcommand();

  if (subcommand === 'setup') {
    await interaction.deferReply({ ephemeral: true });

    const targetChannel =
      interaction.options.getChannel('channel') || interaction.channel;

    if (!targetChannel || !targetChannel.isTextBased()) {
      return interaction.editReply('❌ Please select a valid text channel.');
    }

    const permissions = targetChannel.permissionsFor(interaction.client.user);
    if (
      !permissions ||
      !permissions.has([
        PermissionFlagsBits.ViewChannel,
        PermissionFlagsBits.SendMessages,
        PermissionFlagsBits.EmbedLinks,
      ])
    ) {
      return interaction.editReply(
        `❌ Missing permissions in ${targetChannel}. The bot requires **View Channel**, **Send Messages**, and **Embed Links**.`
      );
    }

    try {
      const message = await registerChannel(interaction.guildId, targetChannel);
      return interaction.editReply({
        content: `✅ VPS monitoring successfully activated in ${targetChannel}!\n• **Refresh Interval:** Every ${config.checkInterval} seconds\n• **Embed Message:** [Jump to Message](${message.url})`,
      });
    } catch (err) {
      console.error('[Command: /monitor setup] Error:', err);
      return interaction.editReply(`❌ Failed to start monitoring: ${err.message}`);
    }
  }

  if (subcommand === 'stop') {
    await interaction.deferReply({ ephemeral: true });

    const deleteMessage = interaction.options.getBoolean('delete_message') ?? false;
    const removed = await unregisterChannel(interaction.guildId, deleteMessage);

    if (!removed) {
      return interaction.editReply('ℹ️ Live VPS monitoring is not active in this server.');
    }

    return interaction.editReply(
      `✅ Live VPS monitoring has been stopped.${
        deleteMessage ? ' The monitoring embed was deleted.' : ''
      }`
    );
  }

  if (subcommand === 'status') {
    const current = getMonitorConfig(interaction.guildId);

    const embed = new EmbedBuilder()
      .setTitle('⚙️ VPS Monitor Configuration')
      .setColor(current?.enabled ? 0x2ecc71 : 0x95a5a6)
      .setTimestamp();

    if (current && current.enabled) {
      embed.addFields(
        { name: 'Status', value: '🟢 Active & Monitoring', inline: true },
        { name: 'Channel', value: `<#${current.channelId}>`, inline: true },
        { name: 'Update Interval', value: `${config.checkInterval} seconds`, inline: true },
        {
          name: 'Tracked Message ID',
          value: current.messageId ? `\`${current.messageId}\`` : 'None',
          inline: true,
        },
        {
          name: 'Last Sync',
          value: current.lastUpdated
            ? `<t:${Math.floor(current.lastUpdated / 1000)}:R>`
            : 'Unknown',
          inline: true,
        }
      );
    } else {
      embed.setDescription(
        '⚪ No monitor channel currently configured for this server.\nUse `/monitor setup` to register one!'
      );
    }

    return interaction.reply({ embeds: [embed], ephemeral: true });
  }
}
