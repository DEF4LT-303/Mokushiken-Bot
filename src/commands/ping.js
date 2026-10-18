import { SlashCommandBuilder, EmbedBuilder } from 'discord.js';

export const data = new SlashCommandBuilder()
  .setName('ping')
  .setDescription('Test bot latency, Discord API roundtrip, and VPS network connection');

export async function execute(interaction) {
  const startTime = Date.now();
  await interaction.deferReply();
  const restLatency = Date.now() - startTime;
  const wsLatency = Math.round(interaction.client.ws.ping);

  // Measure VPS internet latency via Cloudflare DNS over HTTPS or fast socket
  let internetLatency = null;
  const netStart = Date.now();
  try {
    const res = await fetch('https://1.1.1.1', { method: 'HEAD', signal: AbortSignal.timeout(3000) });
    if (res.ok || res.status) {
      internetLatency = Date.now() - netStart;
    }
  } catch {
    internetLatency = null;
  }

  const getStatusColor = (ms) => {
    if (ms < 100) return 0x2ecc71; // Green
    if (ms < 250) return 0xf1c40f; // Yellow
    return 0xe74c3c; // Red
  };

  const embed = new EmbedBuilder()
    .setTitle('🏓 Latency & Network Diagnostics')
    .setColor(getStatusColor(Math.max(wsLatency, restLatency)))
    .addFields(
      {
        name: '🌐 Discord WebSocket',
        value: `\`${wsLatency >= 0 ? `${wsLatency}ms` : 'Connecting...'}\``,
        inline: true,
      },
      {
        name: '⚡ REST Roundtrip',
        value: `\`${restLatency}ms\``,
        inline: true,
      },
      {
        name: '🌍 VPS Internet (1.1.1.1)',
        value: internetLatency !== null ? `\`${internetLatency}ms\`` : '`Unavailable`',
        inline: true,
      }
    )
    .setFooter({ text: 'VPS Monitor Diagnostics' })
    .setTimestamp();

  return interaction.editReply({ embeds: [embed] });
}
