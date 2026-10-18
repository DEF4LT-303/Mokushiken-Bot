import { SlashCommandBuilder, PermissionFlagsBits } from 'discord.js';
import { getDetailedNetwork } from '../services/systemService.js';
import { buildNetworkEmbed } from '../services/embedBuilder.js';
import { ensureServerOwner } from '../utils/permissions.js';
import { config } from '../config.js';
import os from 'node:os';

export const data = new SlashCommandBuilder()
  .setName('network')
  .setDescription('Display network adapters, IP addresses, and traffic (Server Owner only)')
  .setDefaultMemberPermissions(PermissionFlagsBits.Administrator);

export async function execute(interaction) {
  if (!(await ensureServerOwner(interaction))) return;

  await interaction.deferReply({ ephemeral: true });

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
