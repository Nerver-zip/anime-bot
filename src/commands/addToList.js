/**
 * Add up to 15 animes to an existing list
 */

const { SlashCommandBuilder, EmbedBuilder, MessageFlags } = require('discord.js');

const searchJikanAnime = require('../utils/searchAnime.js');
const addAnimeToUserList = require('../utils/addAnimeToUserList.js');
const fetchAnimeList = require('../utils/fetchAnimeList.js');
const User = require('../models/User.js');

module.exports = {
    data: new SlashCommandBuilder()
        .setName('add-to-list')
        .setDescription('Adds one or more animes to a list')
        .addStringOption(option =>
            option.setName('listname')
                .setDescription('Name of the list ')
                .setRequired(true)
                .setAutocomplete(true)
        )
        .addStringOption(option =>
            option.setName('anime1')
                .setDescription('anime 1')
                .setRequired(false)
                .setAutocomplete(true)

        )
        .addStringOption(option =>
            option.setName('anime2')
                .setDescription('anime 2')
                .setRequired(false)
                .setAutocomplete(true)
        )
        .addStringOption(option =>
            option.setName('anime3')
                .setDescription('anime 3')
                .setRequired(false)
                .setAutocomplete(true)
        )
        .addStringOption(option =>
            option.setName('anime4')
                .setDescription('anime 4')
                .setRequired(false)
                .setAutocomplete(true)
        )
        .addStringOption(option =>
            option.setName('anime5')
                .setDescription('anime 5')
                .setRequired(false)
                .setAutocomplete(true)
        )
        .addStringOption(option =>
            option.setName('anime6')
                .setDescription('anime 6')
                .setRequired(false)
                .setAutocomplete(true)
        )
        .addStringOption(option =>
            option.setName('anime7')
                .setDescription('anime 7')
                .setRequired(false)
                .setAutocomplete(true)
        )
        .addStringOption(option =>
            option.setName('anime8')
                .setDescription('anime 8')
                .setRequired(false)
                .setAutocomplete(true)
        )
        .addStringOption(option =>
            option.setName('anime9')
                .setDescription('anime 9')
                .setRequired(false)
                .setAutocomplete(true)
        )
        .addStringOption(option =>
            option.setName('anime10')
                .setDescription('anime 10')
                .setRequired(false)
                .setAutocomplete(true)
        )
        .addStringOption(option =>
            option.setName('anime11')
                .setDescription('anime 11')
                .setRequired(false)
                .setAutocomplete(true)
        )
        .addStringOption(option =>
            option.setName('anime12')
                .setDescription('anime 12')
                .setRequired(false)
                .setAutocomplete(true)
        )
        .addStringOption(option =>
            option.setName('anime13')
                .setDescription('anime 13')
                .setRequired(false)
                .setAutocomplete(true)
        )
        .addStringOption(option =>
            option.setName('anime14')
                .setDescription('anime 14')
                .setRequired(false)
                .setAutocomplete(true)
        )
        .addStringOption(option =>
            option.setName('anime15')
                .setDescription('anime 15')
                .setRequired(false)
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
            const validAnimeFields = new Set([
                'anime1', 'anime2', 'anime3', 'anime4', 'anime5',
                'anime6', 'anime7', 'anime8', 'anime9', 'anime10',
                'anime11', 'anime12', 'anime13', 'anime14', 'anime15',
            ]);

            if (validAnimeFields.has(optionName)) {
                const selectedListName = interaction.options.getString('listname');
            
                if (!selectedListName || !userDoc.lists.has(selectedListName)) {
                    return await interaction.respond([]);
                }
            
                const currentList = userDoc.lists.get(selectedListName);
                if (currentList.length >= 15) {
                    return await interaction.respond([
                        { name: 'This list already has 15 animes.', value: 'limit' }
                    ]);
                }
            
                const jikanResponse = await searchJikanAnime(searchTerm);
                if (!jikanResponse.data) return await interaction.respond([]);
            
                const choices = jikanResponse.data.slice(0, 25).map(anime => {
                    const title = anime.title;
                    const name = title.length > 100 ? title.substring(0, 97) + '...' : title;
                    return { name, value: String(anime.mal_id) };
                });
                return await interaction.respond(choices);
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
            const animeList = [];

            const userDoc = await User.findOne({user_id: userId});

            if (!userDoc) {
                return await interaction.editReply({
                    content: `❌ Error on fetching user info. Please try again later.`,
                    flags: MessageFlags.Ephemeral
                });
            }

            if (userDoc && !userDoc.lists.has(listName)) {
                return await interaction.editReply({
                    content: `❌ This list's name doesn't exist! Checkout your current lists with /my-lists.`,
                    flags: MessageFlags.Ephemeral
                });
            }

            for (let i = 1; i <= 15; i++) {
                const anime = interaction.options.getString(`anime${i}`);
                if (anime) animeList.push(anime);
            }

            if (animeList.length + userDoc.lists.get(listName).length > 15) {
                return await interaction.editReply({
                    content: `❌ You can only have up to 15 animes in a list. This operation would exceed that limit.`,
                    flags: MessageFlags.Ephemeral
                });
            }

            // Verifiy duplicates
            const existingList = userDoc.lists.get(listName) || [];
            const existingIds = new Set(existingList.map(anime => anime.id));
            const animeIdsToAdd = animeList.map(Number);

            const hasDuplicates = animeIdsToAdd.some(id => existingIds.has(id));
            if (hasDuplicates) {
                return await interaction.editReply({
                    content: `❌ One or more of the selected animes are already in the list.`,
                    flags: MessageFlags.Ephemeral
                });
            }

            const apiAnimeList = await fetchAnimeList(animeIdsToAdd);
            if (!apiAnimeList || apiAnimeList.length === 0) {
                return await interaction.editReply({
                    content: `❌ Failed to fetch information about the animes.`,
                    flags: MessageFlags.Ephemeral
                });
            }

            for (const animeData of apiAnimeList) {
                const success = await addAnimeToUserList(userId, animeData, listName);
                if (!success) {
                    return await interaction.editReply({
                        content: `❌ Unexpected error while adding an anime to the list.`,
                        flags: MessageFlags.Ephemeral
                    });
                }
            }

            let thumbnail;

            const size = apiAnimeList.length;
            const animeLines = apiAnimeList.slice(0, 15).map((anime, index) => {
                const title = anime?.data?.title || 'Unknown title';
                if(!thumbnail)
                    thumbnail = anime.data?.images?.jpg?.large_image_url || anime.data?.images?.jpg?.image_url;
                const url = anime.data?.url;
                const linkTitle = url ? `[${title}](${url})` : title;

                return `**${index + 1}** ${linkTitle}`;
            });

            const embed = new EmbedBuilder()
              .setColor(0x5865F2)
              .setTitle(`${size} anime${size > 1 ? 's were' : ' was'} added to "${listName}"`)
              .setDescription(animeLines.join('\n'))
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