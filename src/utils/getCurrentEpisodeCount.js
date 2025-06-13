/**
 * Uses the Jikan API to fetch the number of aired episodes for a given anime.
 * @param {string|number} malId - The anime ID on MyAnimeList.
 * @returns {Promise<number|null>} The number of released episodes, or null if an error occurs.
 */
async function getCurrentEpisodeCount(malId) {
    if (!malId) {
        console.error("An anime ID must be provided.");
        return null;
    }

    const url = `https://api.jikan.moe/v4/anime/${malId}/episodes`;

    console.log(`[Jikan API] Fetching episode count for ID: ${malId}...`);

    try {
        const response = await fetch(url);
        if (!response.ok) {
            console.error(`[Jikan API] Response error: ${response.status} ${response.statusText}`);
            return null;
        }

        const data = await response.json();

        if (data.data && Array.isArray(data.data)) {
            return data.data.length;
        } else {
            return 0;
        }

    } catch (error) {
        console.error('[Jikan API] Critical request failure:', error);
        return null;
    }
}

// --- TEST BLOCK ---
if (require.main === module) {
    (async () => {
        // To Be Hero X
        const ANIME_ID_TO_TEST = 53447; 

        console.log("--- STARTING EPISODE COUNT TEST ---");
        const count = await getCurrentEpisodeCount(ANIME_ID_TO_TEST);

        if (count !== null) {
            console.log(`\n✅ SUCCESS!`);
            console.log(`The anime with ID ${ANIME_ID_TO_TEST} currently has ${count} released episodes.`);
        } else {
            console.log(`\n❌ FAILURE.`);
            console.log(`Could not retrieve the episode count.`);
        }
        console.log("--- TEST COMPLETED ---");
    })();
}

module.exports = getCurrentEpisodeCount;
