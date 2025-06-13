/**
 * Fetches information about an anime from the Jikan API.
 * @param {string} malId - The anime ID on MyAnimeList.
 * @returns {Promise<object>} A JSON object with the API response.
 * @throws {Error} Throws an error if the request fails.
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
            throw new Error(`Jikan API error: ${response.status} - ${errorData.message}`);
        }
        const data = await response.json();
        return data;

    } catch (error) {
        console.error('Failed to fetch data from Jikan API:', error);
        throw error;
    }
}

// Test module
if (require.main === module) {
    (async () => {
        const anime = await fetchAnimeInfo("53447");
        console.dir(anime, { depth: null });
    })();
}

module.exports = fetchAnimeInfo;
