const User = require('../models/User');

/**
 * Removes an anime from a user's list.
 * 
 * @param {string} userId - Discord user ID.
 * @param {number} animeId - MAL anime ID.
 * @param {string} listKey - Name of the custom list.
 * @returns {Promise<boolean>} - Returns true if anime was removed, false if not found.
 */
async function removeAnimeFromUserList(userId, animeId, listKey) {
  const userDoc = await User.findOne({ user_id: userId });

  if (!userDoc) {
    return false;
  }

  const existingList = userDoc.lists.get(listKey);
  if (!existingList) {
    return false;
  }

  const filteredList = existingList.filter(anime => anime.id !== animeId);

  if (filteredList.length === existingList.length) {
    return false;
  }

  userDoc.lists.set(listKey, filteredList);
  await userDoc.save();

  return true;
}

module.exports = removeAnimeFromUserList;
