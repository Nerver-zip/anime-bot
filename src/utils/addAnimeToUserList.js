const User = require('../models/User');
/**
 * Adds an anime to a user's list. Creates the user if necessary.
 * 
 * @param {string} userId - Discord user ID.
 * @param {number} animeId - Anime ID (from MyAnimeList).
 * @param {string} listKey - Name of the custom list (e.g., 'notifyList').
 * @returns {Promise<boolean>} - Returns true if anime was added, false otherwise
 */
async function addAnimeToUserList(userId, animeId, listKey) {
  const userDoc = await User.findOne({ user_id: userId });

  if (!userDoc) {
    await User.create({
      user_id: userId,
      lists: new Map([[listKey, [animeId]]])
    });
    return true;
    } 
  else {
    const existingList = userDoc.lists.get(listKey) || [];
    
    if (existingList.includes(animeId)) {
      return false;
    }

    if (existingList.length >= 15) {
      return false;
    }
    
    userDoc.lists.set(listKey, [...existingList, animeId]);
    await userDoc.save();
    return true;
   }
}

module.exports = addAnimeToUserList;