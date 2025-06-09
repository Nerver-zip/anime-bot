// utils/getAnimeId.js

const dotenv = require('dotenv');
dotenv.config();

/**
 * Busca na API do MAL e retorna o ID do primeiro resultado encontrado para um anime.
 * @param {string} animeName - O nome do anime para buscar.
 * @returns {Promise<number|null>} O ID do anime ou null se não for encontrado ou em caso de erro.
 */
async function getAnimeId(animeName) {
    if (!animeName || typeof animeName !== 'string') {
        console.error("Nome do anime inválido.");
        return null;
    }

    console.log(`[API] Buscando por "${animeName}"...`);

    // Otimização: Usamos limit=1 pois só queremos o resultado mais relevante (o primeiro).
    const url = `https://api.myanimelist.net/v2/anime?q=${encodeURIComponent(animeName)}&limit=1`;

    try {
        const response = await fetch(url, {
            method: 'GET',
            headers: { 'X-MAL-CLIENT-ID': process.env.MAL_CLIENT_ID },
        });

        if (!response.ok) {
            console.error(`[API] Erro de resposta: ${response.status} ${response.statusText}`);
            return null;
        }

        const data = await response.json();
        
        // --- PARA OBSERVAR A RESPOSTA COMPLETA DA API ---
        // Descomente a linha abaixo para ver tudo que a API retornou
        // console.log('[API] Resposta completa recebida:', JSON.stringify(data, null, 2));
        // ----------------------------------------------------

        // Verificamos se a API retornou algum resultado na lista 'data'
        if (data.data && data.data.length > 0) {
            // O primeiro item (data.data[0]) é o resultado mais relevante.
            // O ID está dentro da propriedade 'node'.
            const animeId = data.data[0].node.id;
            return animeId;
        } else {
            // Se a lista 'data' for vazia, o anime não foi encontrado.
            console.log(`[API] Nenhum resultado encontrado para "${animeName}".`);
            return null;
        }

    } catch (error) {
        console.error('[API] Falha crítica na requisição:', error);
        return null;
    }
}


// --- BLOCO DE TESTE ---
// Esta parte só será executada quando você rodar o arquivo diretamente.
// Ela não atrapalhará quando você importar a função em outros arquivos.
if (require.main === module) {
    (async () => {
        // Altere o nome aqui para testar diferentes animes
        const animeNameToTest = 'To Be Hero X'; 
        
        console.log("--- INICIANDO TESTE INDIVIDUAL ---");
        const id = await getAnimeId(animeNameToTest);

        if (id) {
            console.log(`\n✅ SUCESSO!`);
            console.log(`O ID do anime "${animeNameToTest}" é: ${id}`);
        } else {
            console.log(`\n❌ FALHA.`);
            console.log(`Não foi possível obter o ID para "${animeNameToTest}".`);
        }
        console.log("--- TESTE FINALIZADO ---");
    })();
}


// Exporta a função para poder usá-la em seus comandos do Discord
module.exports = {getAnimeId};