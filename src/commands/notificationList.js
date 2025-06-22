/**
 * Display the full list of animes to be notified for a given user
 */
const {
  SlashCommandBuilder,
  EmbedBuilder,
  AttachmentBuilder,
  MessageFlags
} = require('discord.js');

const path = require('path');

const User = require('../models/User.js');
const fetchAnimeList = require('../utils/fetchAnimeList.js');

module.exports = {
  data: new SlashCommandBuilder()
    .setName('notification-list')
    .setDescription('Check out what animes are set for you to be notified when a new release is out'),

  async execute(interaction) {
    try {
      await interaction.deferReply({ flags: MessageFlags.Ephemeral });

      const userId = interaction.user.id;
      const query = {user_id: userId};

      const userDoc = await User.findOne(query);

      if (!userDoc) {
          return await interaction.editReply({
            content: `🚫 User not found. Add an anime to a list to get started!`
          });
      }

      const notifyList = userDoc.lists.get('notifyList');

      if (!notifyList || notifyList.length === 0) {
        return await interaction.editReply({
          content: `Your notification list is empty.`
        });
      }

      const animes = await fetchAnimeList(notifyList);

      if (!animes) {
        return await interaction.editReply({
          content: `Error on fetching your list's information`
        });
      }

      if (animes.length === 0) {
        return await interaction.editReply({
          content: `Your notification list is empty`
        });
      }

      const size = animes.length;
      const animeLines = animes.slice(0, 15).map((anime, index) => {
        const title = anime.data?.title ?? 'Unknown title';
        const url = anime.data?.url;
        const linkTitle = url ? `[${title}](${url})` : title;
        const broadcast = anime.data?.broadcast;
        const schedule = broadcast?.string || `${broadcast?.day ?? 'Unknown'} at ${broadcast?.time ?? 'Unknown'}`;

        return `**${index + 1}** ${linkTitle} → 📅 ${schedule}`;
      });

      const iconPath = path.resolve(__dirname, '../images/discord_icon.png');
      const thumbnail = new AttachmentBuilder(iconPath);

      const embed = new EmbedBuilder()
        .setColor(0x5865F2)
        .setTitle(`📺 You have ${size} anime(s) in your notification list`)
        .setDescription(animeLines.join('\n'))
        .setThumbnail('attachment://discord_icon.png')
        .setFooter({ text: `Source: Jikan API | Max 15 listed` });

      await interaction.editReply({
        embeds: [embed],
        files: [thumbnail]
      });
    } 
    catch (error) {
      console.error(err);
      await interaction.editReply({
        content: '❌ An unexpected error occurred.'
      });
    }
  },
};
