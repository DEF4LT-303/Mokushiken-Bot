import { SlashCommandBuilder, PermissionFlagsBits } from 'discord.js';
import { getSystemStats } from '../services/systemService.js';
import { buildStatusSnapshotEmbed } from '../services/embedBuilder.js';
import { ensureServerOwner } from '../utils/permissions.js';

export const data = new SlashCommandBuilder()
  .setName('status')
  .setDescription('Get a private snapshot of VPS system health (Server Owner only)')
  .setDefaultMemberPermissions(PermissionFlagsBits.Administrator);

export async function execute(interaction) {
  if (!(await ensureServerOwner(interaction))) return;

  await interaction.deferReply({ ephemeral: true });

  try {
    const stats = await getSystemStats();
    const avatarUrl =
      interaction.client.user?.displayAvatarURL?.({ extension: 'png', size: 256 }) || null;
    const embed = buildStatusSnapshotEmbed(stats, interaction.client.ws.ping, avatarUrl);
    return interaction.editReply({ embeds: [embed] });
  } catch (err) {
    console.error('[Command: /status] Error:', err);
    return interaction.editReply(`❌ Failed to retrieve system statistics: ${err.message}`);
  }
}
