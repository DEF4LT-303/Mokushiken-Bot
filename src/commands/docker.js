import { SlashCommandBuilder } from 'discord.js';
import { getDockerInfo } from '../services/systemService.js';
import { buildDockerEmbed } from '../services/embedBuilder.js';
import { config } from '../config.js';
import os from 'node:os';

export const data = new SlashCommandBuilder()
  .setName('docker')
  .setDescription('List Docker containers and runtime status');

export async function execute(interaction) {
  await interaction.deferReply();

  const serverName = config.serverName || os.hostname();

  try {
    const dockerInfo = await getDockerInfo();
    const embed = buildDockerEmbed(serverName, dockerInfo);
    return interaction.editReply({ embeds: [embed] });
  } catch (err) {
    console.error('[Command: /docker] Error:', err);
    return interaction.editReply(`❌ Failed to retrieve Docker information: ${err.message}`);
  }
}
