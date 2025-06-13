const Anime = require('../models/Anime.js');
const getCurrentEpisodeCount = require('./getCurrentEpisodeCount.js'); // A função que já criamos
const { EmbedBuilder } = require('discord.js');

/**
 * Verifica todos os animes no banco de dados, compara com os episódios atuais da API
 * e notifica os usuários sobre novos lançamentos.
 * @param {import('discord.js').Client} client O cliente do Discord para poder enviar DMs.
 */
async function checkNewEpisodes(client) {
    console.log(`[CRON JOB] ${new Date().toLocaleString('pt-BR')}: Starting new episode check...`);
    
    // 1. Busca todos os animes que foram adicionados no banco
    const animesInDB = await Anime.find({});
    if (!animesInDB.length) {
        console.log('[CRON JOB] No anime found in database to check.');
        return;
    }

    // 2. Itera sobre cada anime para verificar se há atualizações.
    for (const anime of animesInDB) {
        try {
            // Busca o número atual de episódios na Jikan API
            const currentApiEpisodes = await getCurrentEpisodeCount(anime.mal_id);

            // 3. Compara os episódios da API com os que temos registrados.
            if (currentApiEpisodes !== null && currentApiEpisodes > anime.last_episode) {
                console.log(`[NOTIFICATION] New episode(s) of "${anime.title}"! Released: ${currentApiEpisodes}, Recorded in DB: ${anime.last_episode}`);

                const newEpisodeCount = currentApiEpisodes - anime.last_episode;
                const plural = newEpisodeCount > 1 ? 's' : '';
                const episodeTextField = newEpisodeCount > 1 
                    ? `Episodes ${anime.last_episode + 1} to ${currentApiEpisodes}` 
                    : `Episode ${currentApiEpisodes}`;

                // 4. Se houver diferença, notifica todos os usuários que adicionaram este anime.
                for (const userId of anime.notificar) {
                    try {
                        // Busca o objeto do usuário para poder enviar a DM
                        const user = await client.users.fetch(userId);
                        
                        // Cria uma mensagem bonita (Embed) para a notificação
                        const notificationEmbed = new EmbedBuilder()
                            .setColor(0x3BA55D) // Green
                            .setTitle(`📢 New episode${plural} of ${anime.title}!`)
                            .setThumbnail(anime.imageUrl)
                            .setURL(`https://myanimelist.net/anime/${anime.mal_id}`)
                            .setDescription(`Hey! **${newEpisodeCount}** new episode${plural} of **${anime.title}** ${newEpisodeCount > 1 ? 'are' : 'is'} now available for you to watch.`)
                            .addFields({ name: 'Release', value: episodeTextField })
                            .setFooter({ text: 'Anime-Bot Notifications' })
                            .setTimestamp();
                        
                        // Envia a DM para o usuário
                        await user.send({ embeds: [notificationEmbed] });

                    } catch (dmError) {
                        console.log(`[NOTIFICATION] Failed to notify user ${userId} for anime "${anime.title}". The user may have DMs disabled or no longer shares servers.`);
                    }
                }

                // 5. Após notificar todo mundo, atualiza nosso banco de dados com a nova contagem.
                await Anime.updateOne(
                    { mal_id: anime.mal_id },
                    { $set: { last_episode: currentApiEpisodes } }
                );
                console.log(`[NOTIFICATION] Database updated for "${anime.title}". New count: ${currentApiEpisodes}.`);
            }
        } catch (error) {
            console.error(`[CRON JOB] Error checking anime "${anime.title}" (ID: ${anime.mal_id}):`, error);
        }
    }
    console.log(`[CRON JOB] New episode check completed.`);
}

module.exports = checkNewEpisodes;
