/**
 * Busca informações de um anime na API do Jikan.
 * @param {string} animeId - O nome do id do anime no MAL.
 * @returns {Promise<object>} Um objeto JSON com a resposta da API.
 * @throws {Error} Lança um erro se a requisição falhar.
 */

async function fetchAnimeInfo(malId) {
    if (!malId) {
        return { data: [] };
    }

    const url = `https://api.jikan.moe/v4/anime/${malId}`;

    try {
        const response = await fetch(url, {
            method: 'GET'
        });
        if (!response.ok) {
            const errorData = await response.json();
            throw new Error(`Erro da Jikan API: ${response.status} - ${errorData.message}`);
        }
        const data = await response.json();
        return data;

    } catch (error) {
        console.error('Falha ao buscar dados na Jikan API:', error);
        throw error;
    }
}
//Testing module
if (require.main === module) {
    (async () => {
        const anime = await fetchAnimeInfo("53447");
        console.dir(anime, { depth: null });
    })();
}
module.exports = fetchAnimeInfo;