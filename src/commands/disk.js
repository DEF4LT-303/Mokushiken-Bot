import { SlashCommandBuilder, PermissionFlagsBits } from 'discord.js';
import { getDetailedDisks } from '../services/systemService.js';
import { buildDiskEmbed } from '../services/embedBuilder.js';
import { ensureServerOwner } from '../utils/permissions.js';
import { config } from '../config.js';
import os from 'node:os';

export const data = new SlashCommandBuilder()
  .setName('disk')
  .setDescription('View detailed storage partitions and disk usage (Server Owner only)')
  .setDefaultMemberPermissions(PermissionFlagsBits.Administrator);

export async function execute(interaction) {
  if (!(await ensureServerOwner(interaction))) return;

  await interaction.deferReply({ ephemeral: true });

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
