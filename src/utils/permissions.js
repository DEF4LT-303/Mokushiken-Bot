import { config } from '../config.js';

/**
 * Checks if the interacting user is the Discord server owner or a configured bot owner.
 * @param {import('discord.js').ChatInputCommandInteraction} interaction
 * @returns {boolean}
 */
export function isServerOwner(interaction) {
  if (!interaction.guild) return false;
  return (
    interaction.guild.ownerId === interaction.user.id ||
    config.ownerIds.includes(interaction.user.id)
  );
}

/**
 * Validates server owner access and sends an ephemeral rejection if unauthorized.
 * @param {import('discord.js').ChatInputCommandInteraction} interaction
 * @returns {Promise<boolean>} returns true if authorized, false if rejected
 */
export async function ensureServerOwner(interaction) {
  if (!interaction.guildId) {
    await interaction.reply({
      content: '❌ This command can only be used inside a Discord server.',
      ephemeral: true,
    });
    return false;
  }

  if (!isServerOwner(interaction)) {
    await interaction.reply({
      content: '⛔ Access restricted. This VPS command can only be used by the server owner.',
      ephemeral: true,
    });
    return false;
  }

  return true;
}
