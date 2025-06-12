const Anime = require('../models/Anime.js');
const getCurrentEpisodeCount = require('./getCurrentEpisodeCount.js'); // A função que já criamos
const { EmbedBuilder } = require('discord.js');

/**
 * Verifica todos os animes no banco de dados, compara com os episódios atuais da API
 * e notifica os usuários sobre novos lançamentos.
 * @param {import('discord.js').Client} client O cliente do Discord para poder enviar DMs.
 */
async function checkNewEpisodes(client) {
    console.log(`[CRON JOB] ${new Date().toLocaleString('pt-BR')}: Iniciando verificação de novos episódios...`);
    
    // 1. Busca todos os animes que foram favoritados no banco
    const animesInDB = await Anime.find({});
    if (!animesInDB.length) {
        console.log('[CRON JOB] Nenhum anime no banco de dados para verificar.');
        return;
    }

    // 2. Itera sobre cada anime para verificar se há atualizações.
    for (const anime of animesInDB) {
        try {
            // Busca o número atual de episódios na Jikan API
            const currentApiEpisodes = await getCurrentEpisodeCount(anime.mal_id);

            // 3. Compara os episódios da API com os que temos registrados.
            if (currentApiEpisodes !== null && currentApiEpisodes > anime.ultimo_episodio) {
                console.log(`[NOTIFICAÇÃO] Novo(s) episódio(s) de "${anime.titulo}"! Lançado(s): ${currentApiEpisodes}, Registrado no DB: ${anime.ultimo_episodio}`);

                const newEpisodeCount = currentApiEpisodes - anime.ultimo_episodio;
                const plural = newEpisodeCount > 1 ? 's' : '';
                const plural2 = newEpisodeCount > 1 ? 'ão' : 'á';
                const plural3 = newEpisodeCount > 1 ? 'is' : 'l';
                const episodeTextField = newEpisodeCount > 1 ? `Episódios ${anime.ultimo_episodio + 1} a ${currentApiEpisodes}` : `Episódio ${currentApiEpisodes}`;

                // 4. Se houver diferença, notifica todos os usuários que favoritaram este anime.
                for (const userId of anime.notificar) {
                    try {
                        // Busca o objeto do usuário para poder enviar a DM
                        const user = await client.users.fetch(userId);
                        
                        // Cria uma mensagem bonita (Embed) para a notificação
                        const notificationEmbed = new EmbedBuilder()
                            .setColor(0x3BA55D) // Verde
                            .setTitle(`📢 Novo episódio de ${anime.titulo}!`)
                            .setThumbnail(anime.imageUrl)
                            .setURL(`https://myanimelist.net/anime/${anime.mal_id}`)
                            .setDescription(`Opa! **${newEpisodeCount}** novo${plural} episódio${plural} de **${anime.titulo}** já est${plural2} disponíve${plural3} para você assistir.`)
                            .addFields({ name: 'Lançamento', value: episodeTextField })
                            .setFooter({ text: 'Anime-Bot Notificações' })
                            .setTimestamp();
                        
                        // Envia a DM para o usuário
                        await user.send({ embeds: [notificationEmbed] });

                    } catch (dmError) {
                        console.log(`[NOTIFICAÇÃO] Falha ao notificar usuário ${userId} para o anime "${anime.titulo}". O usuário pode ter DMs bloqueadas ou não compartilha mais servidores.`);
                    }
                }

                // 5. Após notificar todo mundo, atualiza nosso banco de dados com a nova contagem.
                await Anime.updateOne(
                    { mal_id: anime.mal_id },
                    { $set: { ultimo_episodio: currentApiEpisodes } }
                );
                console.log(`[NOTIFICAÇÃO] Banco de dados atualizado para "${anime.titulo}". Novo contador: ${currentApiEpisodes}.`);
            }
        } catch (error) {
            console.error(`[CRON JOB] Erro ao verificar o anime "${anime.titulo}" (ID: ${anime.mal_id}):`, error);
        }
    }
    console.log(`[CRON JOB] Verificação de novos episódios finalizada.`);
}

module.exports = checkNewEpisodes;