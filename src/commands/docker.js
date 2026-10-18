import { SlashCommandBuilder, PermissionFlagsBits } from 'discord.js';
import { getDockerInfo } from '../services/systemService.js';
import { buildDockerEmbed } from '../services/embedBuilder.js';
import { ensureServerOwner } from '../utils/permissions.js';
import { config } from '../config.js';
import os from 'node:os';

export const data = new SlashCommandBuilder()
  .setName('docker')
  .setDescription('List Docker containers and runtime status (Server Owner only)')
  .setDefaultMemberPermissions(PermissionFlagsBits.Administrator);

export async function execute(interaction) {
  if (!(await ensureServerOwner(interaction))) return;

  await interaction.deferReply({ ephemeral: true });

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
