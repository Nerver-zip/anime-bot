const User = require('../models/User');

/**
 * Adds an anime to a user's list. Creates the user if necessary.
 * 
 * @param {string} userId - Discord user ID.
 * @param {object} animeData - Full anime object returned from Jikan API.
 * @param {string} listKey - Name of the custom list (e.g., 'notifyList').
 * @returns {Promise<boolean>} - Returns true if anime was added, false otherwise.
 */
async function addAnimeToUserList(userId, animeData, listKey) {
  const anime = animeData.data;

  if (!anime?.mal_id || !anime?.title) {
    throw new Error('Invalid anime data: missing id or title');
  }

  const animeObject = {
    id: anime.mal_id,
    name: anime.title,
    url: anime.url,
    image_url: anime.images?.jpg?.image_url || null,
    genres: (anime.genres || []).map(g => g.name),
    themes: (anime.themes || []).map(t => t.name),
    synopsis: anime.synopsis || '',
    episodes: anime.episodes ?? null,
    duration: anime.duration || '',
    aired_from: anime.aired?.from 
      ? new Date(anime.aired.from).toLocaleDateString('en-US', { year: 'numeric', month: 'short', day: 'numeric' })
      : '',
    type: anime.type || '',
    rating: anime.rating || '',
    title_english: anime.title_english || '',
    title_japanese: anime.title_japanese || ''
  };

  const userDoc = await User.findOne({ user_id: userId });

  if (!userDoc) {
    await User.create({
      user_id: userId,
      lists: new Map([[listKey, [animeObject]]])
    });
    return true;
  }

  const existingList = userDoc.lists.get(listKey) || [];

  if (existingList.some(a => a.id === animeObject.id)) {
    return false;
  }

  if (existingList.length >= 15) {
    return false;
  }

  userDoc.lists.set(listKey, [...existingList, animeObject]);
  await userDoc.save();
  return true;
}
module.exports = addAnimeToUserList;
