import { SlashCommandBuilder } from 'discord.js';
import { getDetailedDisks } from '../services/systemService.js';
import { buildDiskEmbed } from '../services/embedBuilder.js';
import { config } from '../config.js';
import os from 'node:os';

export const data = new SlashCommandBuilder()
  .setName('disk')
  .setDescription('View detailed storage partitions and disk usage');

export async function execute(interaction) {
  await interaction.deferReply();

  const serverName = config.serverName || os.hostname();

  try {
    const disks = await getDetailedDisks();
    const embed = buildDiskEmbed(serverName, disks);
    return interaction.editReply({ embeds: [embed] });
  } catch (err) {
    console.error('[Command: /disk] Error:', err);
    return interaction.editReply(`❌ Failed to retrieve disk information: ${err.message}`);
  }
}
