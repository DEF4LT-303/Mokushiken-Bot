import { SlashCommandBuilder, EmbedBuilder } from 'discord.js';
import { exec } from 'node:child_process';
import { promisify } from 'node:util';
import { config } from '../config.js';

const execAsync = promisify(exec);

export const data = new SlashCommandBuilder()
  .setName('exec')
  .setDescription('Execute a shell command directly on the VPS (Owner only)')
  .addStringOption((option) =>
    option
      .setName('command')
      .setDescription('Shell command to execute')
      .setRequired(true)
  );

export async function execute(interaction) {
  // 1. Authorization check
  const isOwner = config.ownerIds.includes(interaction.user.id);
  if (!isOwner) {
    return interaction.reply({
      content: '⛔ Access denied. You are not authorized to execute commands on this VPS.',
      ephemeral: true,
    });
  }

  // 2. Feature toggle check
  if (!config.enableExec) {
    return interaction.reply({
      content: '⚠️ Shell command execution is disabled. Set `ENABLE_EXEC=true` in your `.env` file to enable.',
      ephemeral: true,
    });
  }

  const cmd = interaction.options.getString('command');
  await interaction.deferReply({ ephemeral: true });

  const startTime = Date.now();

  try {
    const { stdout, stderr } = await execAsync(cmd, {
      timeout: 15000, // 15 second safety timeout
      maxBuffer: 1024 * 1024 * 2, // 2MB buffer
    });

    const duration = Date.now() - startTime;
    const output = (stdout || stderr || '(No output produced)').trim();
    const truncatedOutput =
      output.length > 3900 ? `${output.slice(0, 3900)}\n... [Truncated]` : output;

    const embed = new EmbedBuilder()
      .setTitle('💻 Shell Execution Output')
      .setColor(stderr && !stdout ? 0xe67e22 : 0x2ecc71)
      .setDescription(`\`\`\`bash\n$ ${cmd}\n\n${truncatedOutput}\n\`\`\``)
      .setFooter({ text: `Execution time: ${duration}ms` })
      .setTimestamp();

    return interaction.editReply({ embeds: [embed] });
  } catch (err) {
    const duration = Date.now() - startTime;
    const errorOutput = (err.stderr || err.stdout || err.message || 'Unknown error').trim();
    const truncated =
      errorOutput.length > 3900 ? `${errorOutput.slice(0, 3900)}\n... [Truncated]` : errorOutput;

    const embed = new EmbedBuilder()
      .setTitle('❌ Command Execution Failed')
      .setColor(0xe74c3c)
      .setDescription(`\`\`\`bash\n$ ${cmd}\n\n${truncated}\n\`\`\``)
      .setFooter({ text: `Exit code: ${err.code ?? 'error'} • Duration: ${duration}ms` })
      .setTimestamp();

    return interaction.editReply({ embeds: [embed] });
  }
}
