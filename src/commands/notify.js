const { SlashCommandBuilder, EmbedBuilder, ActionRowBuilder, ButtonBuilder, ButtonStyle } = require('discord.js');

const searchJikanAnime = require('../utils/searchAnime.js');        
const fetchJikanDetailsById = require('../utils/fetchAnimeInfo.js'); 
const getCurrentEpisodeCount = require('../utils/getCurrentEpisodeCount.js');

const Anime = require('../models/Anime.js');

module.exports = {
	data: new SlashCommandBuilder()
		.setName('notify')
		.setDescription('Get a DM notification when a new episode is released')
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
		const userId = interaction.user.id;

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
			
			let episodesToSave = totalEpisodes || 0;
			let episodeCountText = String(totalEpisodes || '??');

			if (status === 'Currently Airing') {
				const airedEpisodes = await getCurrentEpisodeCount(animeId);
				if (airedEpisodes !== null) {
					episodesToSave = airedEpisodes;
					episodeCountText = `${airedEpisodes} / ${totalEpisodes || '??'}`;
				}
			}

			const embed = new EmbedBuilder()
				.setColor(0x5865F2)
				.setTitle(title)
				.setURL(url || `https://myanimelist.net/anime/${animeId}`)
				.setDescription(synopsis ? synopsis.substring(0, 250) + '...' : 'Synopsis not available.')
				.setThumbnail(imageUrl)
				.addFields(
					{ name: 'Genres and themes', value: allGenresAndThemes, inline: true },
					{ name: 'Episodes', value: episodeCountText, inline: true },
					{ name: 'Status', value: status, inline: true },
					{ name: 'Average Score', value: String(score || 'N/A'), inline: true }
				)
				.setFooter({ text: `Anime ID: ${animeId} | Source: Jikan API` });
			
			const adicionar = new ButtonBuilder()
				.setCustomId(`add_btn_${animeId}`)
				.setLabel('Add')
				.setStyle(ButtonStyle.Success)
				.setEmoji('✅');
				
			const row = new ActionRowBuilder().addComponents(adicionar);

			const response = await interaction.editReply({ 
				embeds: [embed],
				components: [row] 
			});

			const collectorFilter = i => i.user.id === userId;
			
			try {
				const confirmation = await response.awaitMessageComponent({ filter: collectorFilter, time: 60_000 });
				
				const query = { mal_id: animeId };
				const animeDoc = await Anime.findOne(query);

				if (animeDoc && animeDoc.notify.includes(userId)) {
					await confirmation.update({ 
						content: `You already had "${title}" on your list!`, 
						embeds: [embed],
						components: [] 
					});
				}
				else if(!animeDoc){
        			await Anime.create({
						mal_id: animeId,
        			    title: title,
						imageUrl: imageUrl,
        			    last_episode: episodesToSave,
        			    notify: [userId]
        			});
					await confirmation.update({ 
						content: `"${title}" was added to your list ✅`, 
						embeds: [embed],
						components: []
					});
				}
				else //não atualiza num de eps aqui para evitar race condition
				{
					await Anime.updateOne(
						query,
						{
							$addToSet: { notify: userId },
							$set: { imageUrl: imageUrl }
						}
					);
					await confirmation.update({ 
						content: `"${title}" was added to your list for notifications.`, 
						embeds: [embed],
						components: []
					});
				}
			} catch (e) {
    				console.error("Error on 'add' button: ", e);
    				await interaction.editReply({ 
    				    content: `Error. Try again later`,
    				    embeds: [embed],
    				    components: [] 
    				});
			}
		} catch (error) {
			console.error('Fatal error on /notify execution:', error);
		
			if (interaction.deferred || interaction.replied) {
				await interaction.followUp({ 
					content: 'Unexpected error on processing your request.',
					ephemeral: true 
				});
			} else {
				await interaction.reply({ 
					content: 'Unexpected error on processing your request.',
					ephemeral: true 
				});
			}
		}
	},
};