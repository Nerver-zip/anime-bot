/**
 * Busca nomes de um anime na API do Jikan.
 * @param {string} animeId - O nome do id do anime no MAL.
 * @returns {Promise<object>} Um objeto JSON com a resposta da API.
 * @throws {Error} Lança um erro se a requisição falhar.
 */

async function searchAnime(query) {
    if (!query) return { data: [] };
    const url = `https://api.jikan.moe/v4/anime?q=${encodeURIComponent(query)}&limit=25`;
    const response = await fetch(url);
    if (!response.ok) throw new Error('Falha na busca da Jikan API');
    return await response.json();
}
//Modulo de teste
if (require.main === module) {
    (async () => {
        const anime = await searchAnime("Frieren");
        console.dir(anime, { depth: null });
    })();
}
module.exports = searchAnime;