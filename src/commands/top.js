import { SlashCommandBuilder, PermissionFlagsBits } from 'discord.js';
import { getTopProcesses } from '../services/systemService.js';
import { buildTopProcessesEmbed } from '../services/embedBuilder.js';
import { ensureServerOwner } from '../utils/permissions.js';
import { config } from '../config.js';
import os from 'node:os';

export const data = new SlashCommandBuilder()
  .setName('top')
  .setDescription('List top resource-consuming processes on the VPS (Server Owner only)')
  .setDefaultMemberPermissions(PermissionFlagsBits.Administrator)
  .addStringOption((option) =>
    option
      .setName('sort_by')
      .setDescription('Metric to rank processes by')
      .setRequired(false)
      .addChoices(
        { name: 'CPU Usage', value: 'cpu' },
        { name: 'Memory Usage', value: 'mem' }
      )
  )
  .addIntegerOption((option) =>
    option
      .setName('limit')
      .setDescription('Number of processes to display (default: 10, max: 20)')
      .setMinValue(3)
      .setMaxValue(20)
      .setRequired(false)
  );

export async function execute(interaction) {
  if (!(await ensureServerOwner(interaction))) return;

  await interaction.deferReply({ ephemeral: true });

  const sortBy = interaction.options.getString('sort_by') || 'cpu';
  const limit = interaction.options.getInteger('limit') || 10;
  const serverName = config.serverName || os.hostname();

  try {
    const processes = await getTopProcesses(sortBy, limit);
    const embed = buildTopProcessesEmbed(serverName, processes, sortBy);
    return interaction.editReply({ embeds: [embed] });
  } catch (err) {
    console.error('[Command: /top] Error:', err);
    return interaction.editReply(`❌ Failed to retrieve processes: ${err.message}`);
  }
}
