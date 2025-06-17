const { SlashCommandBuilder, EmbedBuilder } = require('discord.js');

const searchJikanAnime = require('../utils/searchAnime.js');        
const fetchJikanDetailsById = require('../utils/fetchAnimeInfo.js'); 

module.exports = {
    data: new SlashCommandBuilder()
        .setName('info')
        .setDescription('Search an anime')
        .addStringOption(option =>
            option.setName('anime')
                .setDescription('An anime name to search')
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
        try {
            await interaction.deferReply({ ephemeral: true });

            const jikanDetailsResponse = await fetchJikanDetailsById(animeId);

            if (!jikanDetailsResponse || !jikanDetailsResponse.data) {
                return await interaction.editReply({ 
                    content: 'Anime could not be found on Jikan API.'
                });
            }
            
            const animeData = jikanDetailsResponse.data;
            const { title, episodes: totalEpisodes, status, score, images, synopsis, url, genres = [], themes = [], explicit_genres = []} = animeData;
            const imageUrl = images?.jpg?.large_image_url || images?.jpg?.image_url;
			const allGenresAndThemes = [...genres, ...explicit_genres, ...themes].map(item => item.name).join(', ');

            let episodeCountText = String(totalEpisodes || '??');

            if (status === 'Currently Airing') {
                const airedEpisodes = await getCurrentEpisodeCount(animeId);
                if (airedEpisodes !== null) {
                    episodeCountText = `${airedEpisodes} / ${totalEpisodes || '??'}`;
                }
            }

            const embed = new EmbedBuilder()
                .setColor(0x5865F2)
                .setTitle(title)
                .setURL(url || `https://myanimelist.net/anime/${animeId}`)
                .setDescription(synopsis ? synopsis.substring(0, 1250) + '...' : 'Synopsis not available.')
                .setThumbnail(imageUrl)
                .addFields(
                    { name: 'Genres and themes', value: allGenresAndThemes, inline : true},
                    { name: 'Episodes', value: episodeCountText, inline: true },
                    { name: 'Status', value: status, inline: true },
                    { name: 'Average Score', value: String(score || 'N/A'), inline: true }
                )
                .setFooter({ text: `Anime ID: ${animeId} | Source: Jikan API` });
				await interaction.editReply({ embeds: [embed] });
            } 
            catch (error) {
                console.error('Fatal error on /info execution:', error);
                if (interaction.deferred || interaction.replied) {
                    await interaction.followUp({ 
                        content: 'Unexpected error on processing your request.',
                        ephemeral: true 
                    });
                } 
                else {
                await interaction.reply({ 
                    content: 'Unexpected error on processing your request.',
                    ephemeral: true 
                });
            }
        }
    },
};