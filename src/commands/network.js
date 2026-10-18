import { SlashCommandBuilder } from 'discord.js';
import { getDetailedNetwork } from '../services/systemService.js';
import { buildNetworkEmbed } from '../services/embedBuilder.js';
import { config } from '../config.js';
import os from 'node:os';

export const data = new SlashCommandBuilder()
  .setName('network')
  .setDescription('Display network adapters, IP addresses, and data transfers');

export async function execute(interaction) {
  await interaction.deferReply();

  const serverName = config.serverName || os.hostname();

  try {
    const ifaces = await getDetailedNetwork();
    const embed = buildNetworkEmbed(serverName, ifaces);
    return interaction.editReply({ embeds: [embed] });
  } catch (err) {
    console.error('[Command: /network] Error:', err);
    return interaction.editReply(`❌ Failed to retrieve network statistics: ${err.message}`);
  }
}
