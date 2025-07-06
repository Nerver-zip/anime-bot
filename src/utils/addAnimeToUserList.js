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
  const { mal_id: animeId, title: animeName } = animeData.data || {};

  if (!animeId || !animeName) {
    throw new Error('Invalid anime data: missing id or title');
  }

  const animeObject = { id: animeId, name: animeName };

  const userDoc = await User.findOne({ user_id: userId });

  if (!userDoc) {
    await User.create({
      user_id: userId,
      lists: new Map([[listKey, [animeObject]]])
    });
    return true;
  } else {
    const existingList = userDoc.lists.get(listKey) || [];

    if (existingList.some(anime => anime.id === animeId)) {
      return false;
    }

    if (existingList.length >= 15) {
      return false;
    }

    userDoc.lists.set(listKey, [...existingList, animeObject]);
    await userDoc.save();
    return true;
  }
}

module.exports = addAnimeToUserList;
