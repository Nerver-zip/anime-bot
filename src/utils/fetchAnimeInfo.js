const animeCache = new Map();
const CACHE_TTL = 60_000; // 60 seg cache

/**
 * Fetches information about an anime from the Jikan API, with caching.
 * @param {string} malId - The anime ID on MyAnimeList.
 * @returns {Promise<object>} A JSON object with the API response.
 * @throws {Error} Throws an error if the request fails.
 */
async function fetchAnimeInfo(malId) {
    if (!malId) {
        return { data: [] };
    }

    const now = Date.now();
    const cached = animeCache.get(malId);

    if (cached && now - cached.timestamp < CACHE_TTL) {
        return cached.data;
    }

    const url = `https://api.jikan.moe/v4/anime/${malId}`;

    try {
        const response = await fetch(url, {
            method: 'GET'
        });
        if (!response.ok) {
            const errorData = await response.json();
            throw new Error(`Jikan API error: ${response.status} - ${errorData.message}\nFailed to fetch anime ID ${malId}`);
        }
        const data = await response.json();

        animeCache.set(malId, { timestamp: now, data });

        return data;

    } catch (error) {
        console.error('Failed to fetch data from Jikan API:', error);
        throw error;
    }
}

// Test module
if (require.main === module) {
    (async () => {
        const anime = await fetchAnimeInfo("59986");
        console.dir(anime, { depth: null });
    })();
}

module.exports = fetchAnimeInfo;
