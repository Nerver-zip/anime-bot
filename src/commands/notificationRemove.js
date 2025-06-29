/**
 * Remove a user ID from the notification list of an Anime document.
 * Also removes the anime ID from the notifyList of a User document.
 */
const {
  SlashCommandBuilder,
  EmbedBuilder,
  MessageFlags
} = require('discord.js');


const User = require('../models/User.js');
const Anime = require('../models/Anime.js');
const fetchAnimeInfo = require('../utils/fetchAnimeInfo.js');
const fetchAnimeList = require('../utils/fetchAnimeList.js');

module.exports = {
  data: new SlashCommandBuilder()
    .setName('notification-remove')
    .setDescription('Remove an anime from your anime notification list')
    .addStringOption(option =>
      option
        .setName('anime')
        .setDescription('Anime to remove')
        .setAutocomplete(true)
        .setRequired(true)
    ),

  async autocomplete(interaction) {
    const userId = interaction.user.id;
    const focusedValue = interaction.options.getFocused() || '';
    try {
      const userDoc = await User.findOne({ user_id: userId });
      if (!userDoc) return await interaction.respond([]);

      const notifyList = userDoc.lists.get('notifyList') || [];
      const animeList = await fetchAnimeList(notifyList);

      const filtered = animeList
        .filter(anime =>
          anime?.data?.title?.toLowerCase().includes(focusedValue.toLowerCase())
        )
        .slice(0, 15)
        .map(anime => ({
          name: anime.data.title.length > 100
          ? anime.data.title.slice(0, 97) + '...'
          : anime.data.title,
          value: String(anime.data.mal_id), 
        }));
      await interaction.respond(filtered);
    } catch (error) {
      console.error('Autocomplete error:', error);
      await interaction.respond([]);
    }
  },

  async execute(interaction) {
    await interaction.deferReply({ flags: MessageFlags.Ephemeral });
    const animeId = interaction.options.getString('anime');
    if (!animeId) {
      return await interaction.editReply({
      content: '❌ Anime ID is missing or invalid.'
      });
    }
    const userId = interaction.user.id;
    const anime = await fetchAnimeInfo(animeId);

    const animeData = anime.data;

    if (!animeData) {
      return await interaction.editReply({
        content: '❌ Anime not found.'
      });
    }

    const { title, synopsis, images, url} = animeData;
    const imageUrl = images?.jpg?.large_image_url || images?.jpg?.image_url;

    try {
      //Remove user from list of users to be notified from Anime 
      await Anime.updateOne(
        { mal_id: Number(animeId) },
        { $pull: { notify: userId } }
      );

      //Remove anime from User notifyList
      const user = await User.findOne({ user_id: userId });
      if (!user) return;
      const notifyList = user.lists.get('notifyList') || [];
      const updatedList = notifyList.filter(id => String(id) !== animeId);
      user.lists.set('notifyList', updatedList);
      await user.save();

      const embed = new EmbedBuilder()
          .setColor(0x5865F2)
          .setTitle(title)
          .setURL(url || `https://myanimelist.net/anime/${animeId}`)
          .setDescription(synopsis ? synopsis.substring(0, 250) + '...' : 'Synopsis not available.')
          .setThumbnail(imageUrl)
          .addFields(
                      { name: '[INFO]', value: 'Anime successfully removed from your list', inline : true},
                    )
          .setFooter({ text: `Anime ID: ${animeId} | Source: Jikan API` });
      await interaction.editReply({ embeds: [embed] });
    } 
    catch (error) {
      console.error('notification-remove error:', error);
      await interaction.editReply({
        content: '❌ An unexpected error occurred while removing the anime.'
      });
    }
  },
};
