/**
 * Fetches a list of animes from the Jikan API.
 * @param {Array<id>} - A list of anime IDs
 * @returns {Promise<Array<object>>} A list of objects with the API response.
 * @throws {Error} Throws an error if the request fails.
 */

const Bottleneck = require('bottleneck');
const fetchAnimeInfo = require('../utils/fetchAnimeInfo.js');

 // Limited to 3 requests per second according
const limiter = new Bottleneck({
  minTime: 600, // 350ms between calls
  maxConcurrent: 1,
});

async function fetchAnimeList(ids) {
  const limitedFetches = ids.map(id =>
    limiter.schedule(() => fetchAnimeInfo(id))
  );
  return Promise.all(limitedFetches);
}

// Test module
if (require.main === module) {
    (async () => {
        const anime = await fetchAnimeList(["53447", "1337", "30", "20","69"]);
        console.dir(anime, { depth: null });
    })();
}

module.exports = fetchAnimeList;