/**
 * Display the full list of animes within a given user's list
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
    .setName('view-list')
    .setDescription('Check out what animes you have added in a list')
    .addStringOption(option =>
      option
        .setName('listname')
        .setDescription('The name of your anime list')
        .setAutocomplete(true)
        .setRequired(true)
    ),
  async autocomplete(interaction) {
    const focusedValue = interaction.options.getFocused() || ''; 
        try {
            const userId = interaction.user.id;
            const userDoc = await User.findOne({ user_id: userId });
            if (!userDoc) return await interaction.respond([]);
        
            const allKeys = Array.from(userDoc.lists.keys());
            
            const filtered = allKeys
                .filter(key => key !== 'notifyList')
                .filter(key => key.toLowerCase().includes(focusedValue.toLowerCase()))
                .slice(0, 25)
            await interaction.respond(
                filtered.map(key => ({ name: key, value: key }))
            );
        } catch (error) {
            console.error('Autocomplete error:', error);
            await interaction.respond([]);
        }
  },
  async execute(interaction) {
    try {
      await interaction.deferReply({ flags: MessageFlags.Ephemeral });
      const listName = interaction.options.getString('listname');
      const userId = interaction.user.id;
      const query = {user_id: userId};

      const userDoc = await User.findOne(query);

      if (!userDoc) {
          return await interaction.editReply({
            content: `🚫 User not found. Add an anime to a list to get started!`
          });
      }

      const userList = userDoc.lists.get(listName);
          
      if (!userList || userList.length === 0) {
        return await interaction.editReply({
          content: `Your list is empty.`
        });
      }
      
      const animeIds = userList.map(anime => anime.id);
      const animes = await fetchAnimeList(animeIds);

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
      
      let thumbnail;
      const size = animes.length;
      const animeLines = animes.slice(0, 15).map((anime, index) => {
        const title = anime.data?.title ?? 'Unknown title';
        const url = anime.data?.url;
        const linkTitle = url ? `[${title}](${url})` : title;
        thumbnail = anime.data?.images?.jpg?.large_image_url || anime.data?.images?.jpg?.image_url;
        return `**${index + 1}** ${linkTitle}`;
      });


      const embed = new EmbedBuilder()
        .setColor(0x5865F2)
        .setTitle(`📺 You have ${size} anime(s) in your list`)
        .setDescription(animeLines.join('\n'))
        .setThumbnail(thumbnail)
        .setFooter({ text: `Source: Jikan API | Max 15 listed` });

      await interaction.editReply({
        embeds: [embed],
      });
    } 
    catch (error) {
      console.error(error);
      await interaction.editReply({
        content: '❌ An unexpected error occurred.'
      });
    }
  },
};
