/**
 * Delete a single anime from a user's list
 */
const { SlashCommandBuilder, EmbedBuilder, MessageFlags } = require('discord.js');

const fetchAnimeInfo = require('../utils/fetchAnimeInfo.js');
const fetchAnimeList = require('../utils/fetchAnimeList.js');
const User = require('../models/User.js');

module.exports = {
    data: new SlashCommandBuilder()
        .setName('delete-from-list')
        .setDescription('Deletes a single anime from a provided list')
        .addStringOption(option =>
            option.setName('listname')
                .setDescription('Name of the list')
                .setRequired(true)
                .setAutocomplete(true)
        )
        .addStringOption(option =>
            option.setName('anime')
                .setDescription('Anime to remove')
                .setRequired(true)
                .setAutocomplete(true)

        ),       
    async autocomplete(interaction) {
        const focused = interaction.options.getFocused(true); 
        const optionName = focused.name;
        const searchTerm = focused.value;

        const userId = interaction.user.id;
        const userDoc = await User.findOne({ user_id: userId });
        
        if (!userDoc) 
            return await interaction.respond([]);

        try {
            if (optionName === 'listname') {
                const allKeys = Array.from(userDoc.lists.keys());
                const filtered = allKeys
                    .filter(key => key !== 'notifyList')
                    .filter(key => key.toLowerCase().includes(searchTerm.toLowerCase()))
                    .slice(0, 25)
                return await interaction.respond(
                    filtered.map(key => ({ name: key, value: key }))
                );
            }
            
            if (optionName === 'anime') {
                const selectedListName = interaction.options.getString('listname');
            
                if (!selectedListName || !userDoc.lists.has(selectedListName)) {
                    return await interaction.respond([]);
                }
            
                const currentList = userDoc.lists.get(selectedListName);
                if (currentList.length == 0) {
                    return await interaction.respond([
                        { name: 'This list is already empty!', value: 'limit' }
                    ]);
                }
            
                const animeList = await fetchAnimeList(currentList);
                const filtered = animeList
                  .filter(anime =>
                    anime?.data?.title?.toLowerCase().includes(searchTerm.toLowerCase())
                  )
                  .slice(0, 15)
                  .map(anime => ({
                    name: anime.data.title.length > 100
                    ? anime.data.title.slice(0, 97) + '...'
                    : anime.data.title,
                    value: String(anime.data.mal_id), 
                  }));
                await interaction.respond(filtered);
            }
            return await interaction.respond([]);
        } catch (error) {
            console.error('Autocomplete error:', error);
            return await interaction.respond([]);
        }
    },
    async execute(interaction) {
        try {
            await interaction.deferReply({flags: MessageFlags.Ephemeral});

            const userId = interaction.user.id;
            const listName = interaction.options.getString('listname');
            const animeId = interaction.options.getString('anime');

            const userDoc = await User.findOne({user_id: userId});

            if (!userDoc) {
                return await interaction.editReply({
                    content: `❌ Error on fetching user info. Please try again later.`,
                    flags: MessageFlags.Ephemeral
                });
            }

            const list = userDoc.lists.get(listName) || [];

            if (!list) {
                return await interaction.editReply({
                    content: "❌ This list name doesn't exist. Check your current lists with `/my-lists`.",
                    flags: MessageFlags.Ephemeral
                });
            }

            if (list.length === 0) {
                return await interaction.editReply({
                    content: `❌ This list is already empty!`,
                    flags: MessageFlags.Ephemeral
                });
            }

            if (!animeId) {
                return await interaction.editReply({
                    content: `❌ Could not get anime information. Please try again later`,
                    flags: MessageFlags.Ephemeral
                });
            }

            if (!list.includes(Number(animeId))) {
                return await interaction.editReply({
                    content: `❌ This anime is not in the selected list.`,
                    flags: MessageFlags.Ephemeral
                });
            }

            const apiAnime = await fetchAnimeInfo(animeId);

            if (!apiAnime) {
              return await interaction.editReply({
                content: `Error on fetching your anime information`
              });
            }

            //Delete anime from user list under provided key
            const updatedList = list.filter(id => String(id) !== animeId);
            userDoc.lists.set(listName, updatedList);
            await userDoc.save();
        
            const anime = apiAnime;
            const title = anime?.data?.title || 'Unknown title';
            const thumbnail = anime.data?.images?.jpg?.large_image_url || anime.data?.images?.jpg?.image_url;
            const url = anime.data?.url;
            const linkTitle = url ? `[${title}](${url})` : title;

            const animeLine = `• ${linkTitle}`;

            const embed = new EmbedBuilder()
              .setColor(0x5865F2)
              .setTitle(`An anime was removed from "${listName}"`)
              .setDescription(animeLine)
              .setThumbnail(thumbnail)

            await interaction.editReply({embeds: [embed]});
        }
        catch (error) {
          console.error(error);
          await interaction.editReply({
            content: '❌ An unexpected error occurred.'
          });
        }
    },
};