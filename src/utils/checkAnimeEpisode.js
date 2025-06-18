const { EmbedBuilder } = require('discord.js');
const { DateTime } = require('luxon');

const MAX_DELAY_DAYS = 3;

/**
 * Checks if a new episode of an anime is about to air and sends notifications.
 * @param {object} animeDoc - The anime document from the database.
 * @param {Discord.Client} client - The Discord client.
 */
async function checkAnimeEpisode(animeDoc, client) {
  const { schedule, notify, title, lastNotified, imageUrl } = animeDoc;

  console.log(`[Checker] Checking anime: "${title}"`);

  if (!schedule || !schedule.time || !schedule.day) {
    console.warn(`[Checker] "${title}" skipped: incomplete schedule.`);
    return;
  }

  const timezone = DateTime.local().setZone(schedule.timezone).isValid
    ? schedule.timezone
    : 'Asia/Tokyo';

  const now = DateTime.now().setZone(timezone);
  const todayWeekday = now.toFormat('cccc');

  const scheduled = DateTime.fromFormat(schedule.time, 'HH:mm', { zone: timezone })
    .set({ weekday: 1 }) // Start at Monday
    .plus({ days: getWeekdayOffset(schedule.day) }) // Move to target weekday
    .set({ weekYear: now.weekYear, weekNumber: now.weekNumber }); // Set to current week

  let latestScheduledTime = scheduled;
  if (scheduled > now) {
    latestScheduledTime = scheduled.minus({ weeks: 1 });
  }

  const diffMinutes = now.diff(latestScheduledTime, 'minutes').minutes;
  const diffDays = now.diff(latestScheduledTime, 'days').days;

  console.log(`[Checker] "${title}" was last scheduled on: ${latestScheduledTime.toISO()}`);
  console.log(`[Checker] Now: ${now.toISO()} | Difference: ${diffMinutes.toFixed(1)} min (${diffDays.toFixed(1)} days)`);

  if (!lastNotified && diffDays > 0) {
    console.log(`[Checker] Skipping: missed the first scheduled check, will catch next.`);
    return;
  }

  if (diffDays > MAX_DELAY_DAYS) {
    console.log(`[Checker] Skipped: exceeded max delay of ${MAX_DELAY_DAYS} days.`);
    return;
  }

  const lastNotifiedDate = lastNotified
    ? DateTime.fromJSDate(lastNotified).setZone(timezone)
    : null;

  if (lastNotifiedDate && lastNotifiedDate.hasSame(latestScheduledTime, 'day')) {
    console.log(`[Checker] Already notified on the same day (${lastNotifiedDate.toISODate()}).`);
    return;
  }

  console.log(`[Checker] ✅ Sending notification for "${title}" now...`);

  const embed = new EmbedBuilder()
    .setColor(0x2ecc71)
    .setTitle(`🎬 New Episode: ${title}`)
    .setDescription(`A new episode of **${title}** is airing now!`)
    .setThumbnail(imageUrl || null)
    .setFooter({ text: `Scheduled: ${schedule.day} at ${schedule.time} (${timezone})` })
    .setTimestamp();

  for (const userId of notify) {
    try {
      const user = await client.users.fetch(userId);
      await user.send({ embeds: [embed] });
      console.log(`✅ Notified user ${userId}`);
    } catch (err) {
      console.error(`❌ Error notifying ${userId}:`, err);
    }
  }

  animeDoc.lastNotified = now.toJSDate();
  await animeDoc.save();
  console.log(`[Checker] lastNotified updated for "${title}".`);
}

/**
 * Calculates how many days to add to reach the target weekday.
 * @param {string} targetDayName
 * @returns {number}
 */
function getWeekdayOffset(targetDayName) {
  const days = ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday', 'Sunday'];
  const index = days.indexOf(targetDayName);
  return index !== -1 ? index : 0;
}

module.exports = checkAnimeEpisode;
