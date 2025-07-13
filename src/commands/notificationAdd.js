/** Add an anime to the 'notifyList' of an user.            
 *  It keeps both User and Anime collections synched
 *  If either user or anime doesn't exist in either collection, this command also instanciate one 
 */

const {
  SlashCommandBuilder,
  EmbedBuilder,
  ActionRowBuilder,
  ButtonBuilder,
  ButtonStyle,
  MessageFlags,
} = require('discord.js');

const searchJikanAnime = require('../utils/searchAnime.js');        
const fetchJikanDetailsById = require('../utils/fetchAnimeInfo.js'); 
const Anime = require('../models/Anime.js');
const addAnimeToUserList = require('../utils/addAnimeToUserList.js');
const { scheduleAnime } = require('../scheduler.js'); 

module.exports = {
  data: new SlashCommandBuilder()
    .setName('notification-add')
    .setDescription('Get a DM notification when a new episode is released')
    .addStringOption(option =>
      option.setName('anime')
        .setDescription('Anime name to search')
        .setRequired(true)
        .setAutocomplete(true)
    ),

  async autocomplete(interaction) {
    const focusedValue = interaction.options.getFocused();
    if (!focusedValue) return await interaction.respond([]);

    try {
      const jikanResponse = await searchJikanAnime(focusedValue);
      if (!jikanResponse.data) return await interaction.respond([]);

      const choices = jikanResponse.data.slice(0, 25).map(anime => {
        const title = anime.title;
        const name = title.length > 100 ? title.substring(0, 97) + '...' : title;
        return { name, value: String(anime.mal_id) };
      });

      await interaction.respond(choices);
    } catch (error) {
      console.error('Autocomplete error (Jikan):', error);
      await interaction.respond([]);
    }
  },

  async execute(interaction) {
    const animeId = interaction.options.getString('anime');
    const userId = interaction.user.id;

    try {
      await interaction.deferReply({ flags: MessageFlags.Ephemeral });

      const jikanDetailsResponse = await fetchJikanDetailsById(animeId);
      if (!jikanDetailsResponse || !jikanDetailsResponse.data) {
        return await interaction.editReply({ 
          content: 'Anime not found in Jikan API.'
        });
      }

      const animeData = jikanDetailsResponse.data;
      const {
        title,
        status,
        score,
        images,
        synopsis,
        url,
        genres = [],
        themes = [],
        explicit_genres = [],
        broadcast
      } = animeData;

      const imageUrl = images?.jpg?.large_image_url || images?.jpg?.image_url;
      const allGenresAndThemes = [...genres, ...explicit_genres, ...themes].map(item => item.name).join(', ');

      if (status !== 'Currently Airing' || !broadcast || !broadcast.day || !broadcast.time) {
        return await interaction.editReply({
          content: `🚫 "${title}" is not currently airing or has no defined schedule for new episodes.`
        });
      }

      const embed = new EmbedBuilder()
        .setColor(0x5865F2)
        .setTitle(title)
        .setURL(url || `https://myanimelist.net/anime/${animeId}`)
        .setDescription(synopsis ? synopsis.substring(0, 250) + '...' : 'Synopsis not available.')
        .setThumbnail(imageUrl)
        .addFields(
          { name: 'Genres and themes', value: allGenresAndThemes || 'N/A', inline: true },
          { name: 'Schedule', value: broadcast.string || `${broadcast.day} at ${broadcast.time}`, inline: true },
          { name: 'Status', value: status, inline: true },
          { name: 'Average Score', value: String(score || 'N/A'), inline: true }
        )
        .setFooter({ text: `Anime ID: ${animeId} | Source: Jikan API` });

      const addButton = new ButtonBuilder()
        .setCustomId(`add_btn_${animeId}`)
        .setLabel('Add')
        .setStyle(ButtonStyle.Success)
        .setEmoji('✅');

      const row = new ActionRowBuilder().addComponents(addButton);

      const response = await interaction.editReply({
        embeds: [embed],
        components: [row]
      });

      const collectorFilter = i => i.user.id === userId;

      try {
        const confirmation = await response.awaitMessageComponent({ filter: collectorFilter, time: 60_000 });

        const wasAdded = await addAnimeToUserList(userId, jikanDetailsResponse, 'notifyList');

        if (!wasAdded) {
          return await interaction.editReply({
            content: `🚫 "${title}" is already added or the notification list is full (15 limit reached).`
          });
        }

        const query = { mal_id: animeId };
        let animeDoc = await Anime.findOne(query);

        const normalizedDay = broadcast.day?.trim().replace(/s$/i, '');
        const scheduleObj = {
          day: normalizedDay,
          time: broadcast.time,
          timezone: broadcast.timezone || 'Asia/Tokyo'
        };

        if (animeDoc && Array.isArray(animeDoc.notify) && animeDoc.notify.includes(userId)) {
          await confirmation.update({
            content: `You already have "${title}" in your notification list.`,
            embeds: [embed],
            components: []
          });
        } else if (!animeDoc) {
          const newDoc = await Anime.create({
            mal_id: animeId,
            title,
            imageUrl,
            schedule: scheduleObj,
            notify: [userId]
          });
          await confirmation.update({
            content: `"${title}" has been added to your notification list ✅`,
            embeds: [embed],
            components: []
          });
          await scheduleAnime(newDoc, interaction.client);

        } else {
          await Anime.updateOne(
            query,
            {
              $addToSet: { notify: userId },
              $set: { imageUrl: imageUrl }
            }
          );
          await confirmation.update({
            content: `"${title}" has been added to your notification list.`,
            embeds: [embed],
            components: []
          });
          animeDoc = await Anime.findOne(query);
          await scheduleAnime(animeDoc, interaction.client);
        }
      } catch (e) {
        console.error("Error on 'add' button: ", e);
        await interaction.editReply({
          content: `Timeout or error. Please try again later.`,
          embeds: [embed],
          components: []
        });
      }
    } catch (error) {
      console.error('Fatal error on /notify execution:', error);
      if (interaction.deferred || interaction.replied) {
        await interaction.followUp({
          content: 'Unexpected error occurred while processing your request.',
          flags: MessageFlags.Ephemeral
        });
      } else {
        await interaction.reply({
          content: 'Unexpected error occurred while processing your request.',
          flags: MessageFlags.Ephemeral
        });
      }
    }
  },
};
