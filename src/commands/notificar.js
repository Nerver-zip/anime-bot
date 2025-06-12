const { SlashCommandBuilder, EmbedBuilder, ActionRowBuilder, ButtonBuilder, ButtonStyle } = require('discord.js');

const searchJikanAnime = require('../utils/searchAnime.js');        
const fetchJikanDetailsById = require('../utils/fetchAnimeInfo.js'); 
const getCurrentEpisodeCount = require('../utils/getCurrentEpisodeCount.js');

const Anime = require('../models/Anime.js');

module.exports = {
	data: new SlashCommandBuilder()
		.setName('notificar')
		.setDescription('Receba notificação na sua DM quando um episódio novo lançar.')
		.addStringOption(option =>
			option.setName('anime')
				.setDescription('O nome do anime a ser pesquisado.')
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
			console.error('Erro no autocomplete (Jikan):', error);
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
                    content: 'Não foi possível encontrar detalhes para este anime na Jikan API.'
                });
			}
			
			const animeData = jikanDetailsResponse.data;
			const { title, episodes: totalEpisodes, status, score, images, synopsis, url } = animeData;
			const imageUrl = images?.jpg?.large_image_url || images?.jpg?.image_url;

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
				.setDescription(synopsis ? synopsis.substring(0, 250) + '...' : 'Sem sinopse disponível.')
				.setThumbnail(imageUrl)
				.addFields(
					{ name: 'Episódios', value: episodeCountText, inline: true },
					{ name: 'Status', value: status, inline: true },
					{ name: 'Nota Média', value: String(score || 'N/A'), inline: true }
				)
				.setFooter({ text: `ID do Anime: ${animeId} | Fonte: Jikan API` });
			
			const adicionar = new ButtonBuilder()
				.setCustomId(`adicionar_btn_${animeId}`)
				.setLabel('Adicionar')
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

				if (animeDoc && animeDoc.notificar.includes(userId)) {
					await confirmation.update({ 
						content: `Você já tinha "${title}" na sua lista!`, 
						embeds: [embed],
						components: [] 
					});
				}
				else if(!animeDoc){
        			await Anime.create({
						mal_id: animeId,
        			    titulo: title,
						imageUrl: imageUrl,
        			    ultimo_episodio: episodesToSave,
        			    notificar: [userId]
        			});
					await confirmation.update({ 
						content: `"${title}" foi adicionado aos seus favoritos.`, 
						embeds: [embed],
						components: []
					});
				}
				else //não atualiza num de eps aqui para evitar race condition
				{
					await Anime.updateOne(
						query,
						{ 
							$addToSet: { notificar: userId },
							$addToSet: { imageUrl: imageUrl },
						}
					);
					await confirmation.update({ 
						content: `"${title}" foi adicionado a sua lista para notificações.`, 
						embeds: [embed],
						components: []
					});
				}
			} catch (e) {
				await interaction.editReply({ embeds: [embed], components: [] });
			}
		} catch (error) {
			console.error('Erro fatal na execução de /favoritar:', error);
		
			if (interaction.deferred || interaction.replied) {
				await interaction.followUp({ 
					content: 'Ocorreu um erro inesperado ao processar sua solicitação.',
					ephemeral: true 
				});
			} else {
				await interaction.reply({ 
					content: 'Ocorreu um erro inesperado ao processar sua solicitação.',
					ephemeral: true 
				});
			}
		}
	},
};