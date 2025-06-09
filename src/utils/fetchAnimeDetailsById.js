// utils/fetchAnimeDetailsById.js

const dotenv = require('dotenv');
dotenv.config();

/**
 * Busca detalhes completos de um anime específico pelo seu ID na API do MyAnimeList.
 * @param {string|number} animeId - O ID do anime a ser pesquisado.
 * @returns {Promise<object>} Um objeto JSON com os detalhes do anime.
 * @throws {Error} Lança um erro se a requisição falhar.
 */
async function fetchAnimeDetailsById(animeId) {
    if (!animeId) {
        throw new Error('O ID do anime não foi fornecido.');
    }

    // Lista de campos que queremos receber. Você pode adicionar mais conforme precisar!
    const fields = 'id,title,main_picture,synopsis,num_episodes,status,start_date,mean';
    const url = `https://api.myanimelist.net/v2/anime/${animeId}?fields=${fields}`;

    try {
        const response = await fetch(url, {
            method: 'GET',
            headers: {
                'X-MAL-CLIENT-ID': process.env.MAL_CLIENT_ID,
            },
        });

        if (!response.ok) {
            const errorData = await response.json();
            throw new Error(`Erro da API do MAL: ${response.status} - ${errorData.message}`);
        }

        const data = await response.json();
        return data;

    } catch (error) {
        console.error(`Falha ao buscar detalhes para o anime ID ${animeId}:`, error);
        throw error;
    }
}
(async () => {
    const anime = await fetchAnimeDetailsById("53447");
    console.dir(anime, { depth: null });
})();
module.exports = fetchAnimeDetailsById;