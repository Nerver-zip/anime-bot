const { EmbedBuilder } = require('discord.js');
const { DateTime } = require('luxon');

const MAX_DELAY_MINUTES = 60 * 24 * 3; // 3 dias

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

  const [hourStr, minStr] = schedule.time.split(':');
  const hour = parseInt(hourStr, 10);
  const minute = parseInt(minStr, 10);

  if (isNaN(hour) || isNaN(minute)) {
    console.warn(`[Checker] "${title}" skipped: invalid time format "${schedule.time}".`);
    return;
  }

  const targetWeekday = getWeekdayIndex(schedule.day);
  let candidate = now.set({ hour, minute, second: 0, millisecond: 0 });

  while (candidate.weekday !== targetWeekday) {
    candidate = candidate.minus({ days: 1 });
  }

  const latestScheduledTime = candidate;
  const diffMinutes = now.diff(latestScheduledTime, 'minutes').minutes;

  console.log(`[Checker] "${title}" was last scheduled on: ${latestScheduledTime.toISO()}`);
  console.log(`[Checker] Now: ${now.toISO()} | Difference: ${diffMinutes.toFixed(1)} min`);

  if (diffMinutes > MAX_DELAY_MINUTES) {
    console.log(`[Checker] Skipped: exceeded max delay of 3 days.`);
    return;
  }

  const lastNotifiedDate = lastNotified
    ? DateTime.fromJSDate(lastNotified).setZone(timezone)
    : null;

  if (!lastNotifiedDate) {
    console.log(`[Checker] First time checking or no lastNotified for "${title}".`);
  }

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

function getWeekdayIndex(dayName) {
  const normalized = dayName.trim().toLowerCase().replace(/s$/, '');
  const days = ['monday', 'tuesday', 'wednesday', 'thursday', 'friday', 'saturday', 'sunday'];
  const index = days.indexOf(normalized);
  return index === -1 ? 1 : index + 1; // default to Monday (1)
}

module.exports = checkAnimeEpisode;
