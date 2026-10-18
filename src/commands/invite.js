import {
  SlashCommandBuilder,
  EmbedBuilder,
  ActionRowBuilder,
  ButtonBuilder,
  ButtonStyle,
  OAuth2Scopes,
  PermissionFlagsBits,
} from 'discord.js';

export const data = new SlashCommandBuilder()
  .setName('invite')
  .setDescription('Get an invite link to add this VPS Monitor Bot to other servers');

export async function execute(interaction) {
  const inviteUrl = interaction.client.generateInvite({
    scopes: [OAuth2Scopes.Bot, OAuth2Scopes.ApplicationsCommands],
    permissions: [
      PermissionFlagsBits.ViewChannel,
      PermissionFlagsBits.SendMessages,
      PermissionFlagsBits.EmbedLinks,
      PermissionFlagsBits.ManageMessages,
      PermissionFlagsBits.ReadMessageHistory,
    ],
  });

  const embed = new EmbedBuilder()
    .setTitle('🤖 Invite VPS Monitor Bot')
    .setColor(0x3498db)
    .setDescription(
      'Use the link or button below to add this VPS Monitor Bot to another server with all required permissions pre-configured.'
    )
    .addFields(
      {
        name: '📌 Required Permissions',
        value:
          '• **View Channels** & **Send Messages**\n' +
          '• **Embed Links**\n' +
          '• **Manage Messages** *(to cleanly replace old status embeds on restart)*\n' +
          '• **Read Message History**',
        inline: false,
      },
      {
        name: '🔗 Invite Link',
        value: `[Click here to invite](${inviteUrl})`,
        inline: false,
      }
    )
    .setFooter({ text: 'VPS Monitor Bot' })
    .setTimestamp();

  if (interaction.client.user?.displayAvatarURL()) {
    embed.setThumbnail(
      interaction.client.user.displayAvatarURL({ extension: 'png', size: 256 })
    );
  }

  const row = new ActionRowBuilder().addComponents(
    new ButtonBuilder()
      .setLabel('Add to Discord Server')
      .setStyle(ButtonStyle.Link)
      .setURL(inviteUrl)
      .setEmoji('➕')
  );

  return interaction.reply({ embeds: [embed], components: [row] });
}
