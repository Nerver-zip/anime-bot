const dotenv = require('dotenv');
dotenv.config();

/**
 * Busca na API do MAL e retorna o ID do primeiro resultado encontrado para um anime.
 * @param {string} animeName - O nome do anime para buscar.
 * @returns {Promise<number|null>} O ID do anime ou null se não for encontrado ou em caso de erro.
 */
async function getAnimeId(animeName) {
    if (!animeName || typeof animeName !== 'string') {
        console.error("Invalid anime name.");
        return null;
    }

    console.log(`[API] Searching for "${animeName}"...`);

    const url = `https://api.myanimelist.net/v2/anime?q=${encodeURIComponent(animeName)}&limit=1`;

    try {
        const response = await fetch(url, {
            method: 'GET',
            headers: { 'X-MAL-CLIENT-ID': process.env.MAL_CLIENT_ID },
        });

        if (!response.ok) {
            console.error(`[API] Response error: ${response.status} ${response.statusText}`);
            return null;
        }

        const data = await response.json();
        
        // --- PARA OBSERVAR A RESPOSTA COMPLETA DA API ---
        // Verificamos se a API retornou algum resultado na lista 'data'
        if (data.data && data.data.length > 0) {
            // O primeiro item (data.data[0]) é o resultado mais relevante.
            // O ID está dentro da propriedade 'node'.
            const animeId = data.data[0].node.id;
            return animeId;
        } else {
            // Se a lista 'data' for vazia, o anime não foi encontrado.
            console.log(`[API] No results found for "${animeName}".`);
            return null;
        }

    } catch (error) {
        console.error('[API] Critical request failure:', error);
        return null;
    }
}


// --- BLOCO DE TESTE ---
if (require.main === module) {
    (async () => {
        const animeNameToTest = 'A Rank Party'; 
        
        console.log("--- STARTING INDIVIDUAL TEST ---");
        const id = await getAnimeId(animeNameToTest);

        if (id) {
            console.log(`\n✅ SUCCESS!`);
            console.log(`The ID for the anime "${animeNameToTest}" is: ${id}`);
        } else {
            console.log(`\n❌ FAILURE.`);
            console.log(`Could not retrieve the ID for "${animeNameToTest}".`);
        }
        console.log("--- TEST COMPLETED ---");
    })();
}

module.exports = { getAnimeId };
