import { SlashCommandBuilder } from 'discord.js';
import { getSystemStats } from '../services/systemService.js';
import { buildStatusSnapshotEmbed } from '../services/embedBuilder.js';

export const data = new SlashCommandBuilder()
  .setName('status')
  .setDescription('Get an instant snapshot of VPS system health and resource consumption')
  .addBooleanOption((option) =>
    option
      .setName('ephemeral')
      .setDescription('Whether to make the response visible only to you (default: false)')
      .setRequired(false)
  );

export async function execute(interaction) {
  const isEphemeral = interaction.options.getBoolean('ephemeral') ?? false;
  await interaction.deferReply({ ephemeral: isEphemeral });

  try {
    const stats = await getSystemStats();
    const embed = buildStatusSnapshotEmbed(stats);
    return interaction.editReply({ embeds: [embed] });
  } catch (err) {
    console.error('[Command: /status] Error:', err);
    return interaction.editReply(`❌ Failed to retrieve system statistics: ${err.message}`);
  }
}
