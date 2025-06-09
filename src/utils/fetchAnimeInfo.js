/**
 * Busca informações de um anime na API oficial do MyAnimeList.
 * @param {string} animeName - O nome do anime a ser pesquisado.
 * @returns {Promise<object>} Um objeto JSON com a resposta da API.
 * @throws {Error} Lança um erro se a requisição falhar.
 */

const dotenv = require('dotenv');
dotenv.config(); // Carrega as variáveis do arquivo .env

async function fetchAnimeInfo(animeName) {
    // Se o nome do anime estiver vazio, não faz a requisição.
    if (!animeName) {
        return { data: [] }; // Retorna um objeto no formato esperado, porém vazio.
    }

    // A URL base da API v2 do MAL para buscar animes.
    // O parâmetro 'q' é para a query (busca).
    // O parâmetro 'limit' controla quantos resultados queremos.
    // O parâmetro 'fields' especifica quais campos queremos na resposta, otimizando a busca.
    const url = `https://api.myanimelist.net/v2/anime?q=${encodeURIComponent(animeName)}&limit=10&fields=id,title,main_picture,synopsis`;

    try {
        const response = await fetch(url, {
            method: 'GET',
            headers: {
                // A chave de autenticação é enviada aqui, no cabeçalho (header).
                'X-MAL-CLIENT-ID': process.env.MAL_CLIENT_ID,
            },
        });

        // Se a resposta não for bem-sucedida (ex: erro 400, 401, 500), lança um erro.
        if (!response.ok) {
            const errorData = await response.json();
            throw new Error(`Erro da API do MAL: ${response.status} - ${errorData.message}`);
        }

        // Se tudo deu certo, retorna o corpo da resposta em formato JSON.
        const data = await response.json();
        return data;

    } catch (error) {
        console.error('Falha ao buscar dados na API do MyAnimeList:', error);
        // Em caso de erro, você pode optar por lançar o erro para quem chamou a função tratar,
        // ou retornar um valor padrão. Lançar o erro é geralmente mais informativo.
        throw error;
    }
}
//(async () => {
//    const anime = await fetchAnimeInfo("Frieren");
//    console.dir(anime, { depth: null });
//})();
// Exporta a função para que ela possa ser usada em outros arquivos (ex: nos seus comandos).
module.exports = fetchAnimeInfo;