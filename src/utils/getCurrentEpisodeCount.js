// utils/getCurrentEpisodeCount.js

/**
 * Usando a API Jikan, busca o número de episódios que já foram ao ar para um anime.
 * @param {string|number} malId - O ID do anime no MyAnimeList.
 * @returns {Promise<number|null>} O número de episódios lançados ou null em caso de erro.
 */
async function getCurrentEpisodeCount(malId) {
    if (!malId) {
        console.error("É necessário fornecer um ID de anime.");
        return null;
    }

    // Usamos o endpoint de episódios da Jikan API.
    const url = `https://api.jikan.moe/v4/anime/${malId}/episodes`;
    
    console.log(`[Jikan API] Buscando contagem de episódios para o ID: ${malId}...`);

    try {
        const response = await fetch(url);
        if (!response.ok) {
            console.error(`[Jikan API] Erro de resposta: ${response.status} ${response.statusText}`);
            return null;
        }

        const data = await response.json();

        // O número de episódios lançados é simplesmente o tamanho da lista 'data'.
        if (data.data && Array.isArray(data.data)) {
            return data.data.length;
        } else {
            return 0; // Se não houver dados, retorna 0.
        }

    } catch (error) {
        console.error('[Jikan API] Falha crítica na requisição:', error);
        return null;
    }
}


// --- BLOCO DE TESTE ---
if (require.main === module) {
    (async () => {
        //To Be Hero X
        const ANIME_ID_TO_TEST = 53447; 

        console.log("--- INICIANDO TESTE DE CONTAGEM DE EPISÓDIOS ---");
        const count = await getCurrentEpisodeCount(ANIME_ID_TO_TEST);

        if (count !== null) {
            console.log(`\n✅ SUCESSO!`);
            console.log(`O anime com ID ${ANIME_ID_TO_TEST} tem atualmente ${count} episódios lançados.`);
        } else {
            console.log(`\n❌ FALHA.`);
            console.log(`Não foi possível obter a contagem de episódios.`);
        }
        console.log("--- TESTE FINALIZADO ---");
    })();
}

module.exports = {getCurrentEpisodeCount};