const { SlashCommandBuilder, EmbedBuilder, ActionRowBuilder, ButtonBuilder, ButtonStyle, InteractionResponseFlags } = require('discord.js');

// Módulos Utilitários
const searchJikanAnime = require('../utils/searchAnime.js');         // Busca por NOME na Jikan (para autocomplete)
const fetchJikanDetailsById = require('../utils/fetchAnimeInfo.js');   // Busca por ID na Jikan (para detalhes)
const getCurrentEpisodeCount = require('../utils/getCurrentEpisodeCount.js'); // Busca contagem de episódios na Jikan

// Modelo do Banco de Dados
const Anime = require('../models/Anime.js');

module.exports = {
	data: new SlashCommandBuilder()
		.setName('favoritar')
		.setDescription('Busca um anime e o adiciona à sua lista de favoritos.')
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
			// Inicia a interação de forma efêmera
			await interaction.deferReply({ flags: InteractionResponseFlags.Ephemeral });

			// Etapa 1: Buscar dados das APIs
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

			// Etapa 2: Montar a resposta
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
			
			const favoriteButton = new ButtonBuilder()
				.setCustomId(`favorite_btn_${animeId}`)
				.setLabel('Favoritar')
				.setStyle(ButtonStyle.Success)
				.setEmoji('⭐');
				
			const row = new ActionRowBuilder().addComponents(favoriteButton);

			const response = await interaction.editReply({ 
				embeds: [embed],
				components: [row] 
			});

			// Etapa 3: Esperar interação com o botão
			const collectorFilter = i => i.user.id === userId;
			
			try {
				const confirmation = await response.awaitMessageComponent({ filter: collectorFilter, time: 60_000 });
				
				const query = { titulo: title };
				const animeDoc = await Anime.findOne(query);

				if (animeDoc && animeDoc.favoritado_por.includes(userId)) {
					await confirmation.update({ 
						content: `Você já tinha "${title}" na sua lista de favoritos!`, 
						embeds: [embed],
						components: [] 
					});
				} else {
					await Anime.updateOne(
						query,
						{ 
							$addToSet: { favoritado_por: userId },
							$set: { ultimo_episodio: episodesToSave } 
						},
						{ upsert: true }
					);
					await confirmation.update({ 
						content: `Pronto! "${title}" foi adicionado aos seus favoritos.`, 
						embeds: [embed],
						components: []
					});
				}
			} catch (e) {
				// Timeout do botão, apenas removemos os componentes
				await interaction.editReply({ embeds: [embed], components: [] });
			}
		} catch (error) {
			console.error('Erro fatal na execução de /favoritar:', error);
		
			if (interaction.deferred || interaction.replied) {
				await interaction.followUp({ 
					content: 'Ocorreu um erro inesperado ao processar sua solicitação.',
					flags: InteractionResponseFlags.Ephemeral 
				});
			} else {
				await interaction.reply({ 
					content: 'Ocorreu um erro inesperado ao processar sua solicitação.',
					flags: InteractionResponseFlags.Ephemeral 
				});
			}
		}
	},
};