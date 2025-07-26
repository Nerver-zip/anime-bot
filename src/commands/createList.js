/**
 * Create a new list with up to 15 animes passed as arguments
 */

const { SlashCommandBuilder, EmbedBuilder, MessageFlags } = require('discord.js');

const searchJikanAnime = require('../utils/searchAnime.js');
const addAnimeToUserList = require('../utils/addAnimeToUserList.js');
const fetchAnimeList = require('../utils/fetchAnimeList.js');
const User = require('../models/User.js');

module.exports = {
    data: new SlashCommandBuilder()
        .setName('create-list')
        .setDescription('Creates a new anime list')
        .addStringOption(option =>
            option.setName('listname')
                .setDescription('Name of the list ')
                .setRequired(true)
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
        ),

    async autocomplete(interaction) {
        const focused = interaction.options.getFocused(true);
        const optionName = focused.name;
        const searchTerm = focused.value;

        const validFields = new Set([
            'anime1', 'anime2', 'anime3', 'anime4', 'anime5',
            'anime6', 'anime7', 'anime8', 'anime9', 'anime10',
            'anime11', 'anime12', 'anime13', 'anime14', 'anime15',
        ]);

        if (!validFields.has(optionName) || !searchTerm)
            return await interaction.respond([]);

        try {
            const jikanResponse = await searchJikanAnime(searchTerm);
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
        try {
            await interaction.deferReply({flags: MessageFlags.Ephemeral});
            const userId = interaction.user.id;
            const listName = interaction.options.getString('listname');
            const fullAnimeList = [];

            const userDoc = await User.findOne({user_id: userId});

            if (userDoc && userDoc.lists.has(listName)) {
                return await interaction.editReply({
                    content: `❌ This list's name already exists! Checkout your current lists with /my-lists'.`,
                    flags: MessageFlags.Ephemeral
                });
            }

            if (/[_.$]/.test(listName)) {
                return await interaction.editReply({
                    content: `❌ The list's name cannot contain '_', '.' or '$'.`,
                    flags: MessageFlags.Ephemeral
                });
            }

            for (let i = 1; i <= 15; i++) {
                const anime = interaction.options.getString(`anime${i}`);
                if (anime) fullAnimeList.push(anime);
            }

            const uniqueAniList = [...new Set(fullAnimeList)];

            const apiAnimeList = await fetchAnimeList(uniqueAniList);
            if (!apiAnimeList || apiAnimeList.length === 0) {
                return await interaction.editReply({
                    content: `❌ Failed to fetch information about the animes.`,
                    flags: MessageFlags.Ephemeral
                });
            }

            for(const animeData of apiAnimeList){
                const res = await addAnimeToUserList(userId, animeData, listName);
                if (!res) {
                    return await interaction.editReply({
                    content: `❌ Unexpected error on adding animes to list. Checkout what animes were added with /my-anime-list command`,
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
              .setTitle(`${listName} list created!`)
              .setDescription(animeLines.join('\n'))
              .setThumbnail(thumbnail)
              .setFooter({ text: `${size} ${size === 1 ? 'anime was' : 'animes were'} added | Max 15` });
    
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
