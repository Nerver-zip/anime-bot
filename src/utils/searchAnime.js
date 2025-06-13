/**
 * Searches for anime titles using the Jikan API.
 * @param {string} query - The anime name or search term.
 * @returns {Promise<object>} A JSON object with the API response.
 * @throws {Error} Throws an error if the request fails.
 */

async function searchAnime(query) {
    if (!query) return { data: [] };
    const url = `https://api.jikan.moe/v4/anime?q=${encodeURIComponent(query)}&limit=25`;
    const response = await fetch(url);
    if (!response.ok) throw new Error('Error while searching on the Jikan API');
    return await response.json();
}

// Test module
if (require.main === module) {
    (async () => {
        const anime = await searchAnime("Frieren");
        console.dir(anime, { depth: null });
    })();
}

module.exports = searchAnime;
