import { SlashCommandBuilder, EmbedBuilder } from 'discord.js';

export const data = new SlashCommandBuilder()
  .setName('help')
  .setDescription('View all available VPS Monitor commands and documentation');

export async function execute(interaction) {
  const embed = new EmbedBuilder()
    .setTitle('📖 VPS Monitor Bot — Command Guide')
    .setColor(0x3498db)
    .setDescription(
      'This bot monitors your VPS status and automatically refreshes a dedicated live embed every 30 seconds. On bot restart, previous embeds are cleaned up so duplicate messages are avoided.'
    )
    .addFields(
      {
        name: '📡 Live Monitoring',
        value:
          '• `/monitor setup [channel]` — Activate live 30s status embed in a channel.\n' +
          '• `/monitor stop [delete_message]` — Stop live monitoring in this server.\n' +
          '• `/monitor status` — Check current monitor configuration and health.',
        inline: false,
      },
      {
        name: '🛠️ VPS Diagnostics & Utilities',
        value:
          '• `/status [ephemeral]` — Snapshot of CPU, RAM, Disk, and Network.\n' +
          '• `/ping` — Measure Discord WebSocket, REST roundtrip, and VPS internet gateway.\n' +
          '• `/top [sort_by] [limit]` — List top processes sorted by CPU or Memory.\n' +
          '• `/disk` — View all mounted drives, file systems, and remaining space.\n' +
          '• `/network` — Network adapters, IP addresses, and data transferred.\n' +
          '• `/docker` — List Docker containers, state, and images.\n' +
          '• `/exec <command>` — Execute shell commands on VPS (Owner only, secured).',
        inline: false,
      }
    )
    .setFooter({ text: 'VPS Monitor • Auto-healing live status' })
    .setTimestamp();

  return interaction.reply({ embeds: [embed] });
}
