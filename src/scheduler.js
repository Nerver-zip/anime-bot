const Anime = require('./models/Anime.js');
const { DateTime } = require('luxon');
const checkAnimeEpisode = require('./utils/checkAnimeEpisode.js');

/**
 * Sets up all anime schedules on startup.
 * @param {Discord.Client} client - Discord client instance for sending messages.
 */
async function setupTimersForAnimes(client) {
  console.log(`[Scheduler] ${DateTime.now().toISO()} - Initializing anime schedules...`);

  const animes = await Anime.find({});
  console.log(`[Scheduler] ${DateTime.now().toISO()} - Found ${animes.length} animes in the database.`);

  animes.forEach(animeDoc => {
    console.log(`[Scheduler] ${DateTime.now().toISO()} - Scheduling "${animeDoc.title}" (mal_id: ${animeDoc.mal_id})`);
    scheduleAnime(animeDoc, client);
  });

  console.log(`[Scheduler] ${DateTime.now().toISO()} - All animes have been scheduled.`);
}

/**
 * Schedule an individual anime.
 */
function scheduleAnime(animeDoc, client) {
  const { title, schedule, lastNotified } = animeDoc;

  if (!schedule || !schedule.day || !schedule.time) {
    console.warn(`[Scheduler] ${DateTime.now().toISO()} - Anime "${title}" ignored due to invalid schedule.`);
    return;
  }

  // Base timestamp: se lastNotified é nulo, calcula próximo horário a partir de agora
  const baseTimestamp = lastNotified ? DateTime.fromISO(lastNotified).toMillis() : Date.now();

  const nextRunTime = getNextScheduleTime(schedule, baseTimestamp + 1);
  const delayMs = nextRunTime - Date.now();

  const dtNext = DateTime.fromMillis(nextRunTime).toISO();
  console.log(`[Scheduler] ${DateTime.now().toISO()} - "${title}" will be checked at ${dtNext} (delay: ${(delayMs / 1000 / 60).toFixed(2)} min)`);

  if (delayMs <= 0) {
    console.warn(`[Scheduler] ${DateTime.now().toISO()} - "${title}" time has passed. Checking immediately.`);
    runAndReschedule(animeDoc, client);
  } else {
    setTimeout(() => runAndReschedule(animeDoc, client), delayMs);
  }
}

/**
 * Runs the check and schedules the next one.
 */
async function runAndReschedule(animeDoc, client) {
  const title = animeDoc.title;
  console.log(`[Scheduler] ${DateTime.now().toISO()} - Running check for "${title}"...`);

  try {
    await checkAnimeEpisode(animeDoc, client);

    // Update lastNotified assuming notification/check happened now
    animeDoc.lastNotified = DateTime.now().toISO();
    await animeDoc.save();

    console.log(`[Scheduler] ${DateTime.now().toISO()} - Check completed for "${title}".`);
  } catch (err) {
    console.error(`[Scheduler] ${DateTime.now().toISO()} - Error checking episode for "${title}":`, err);
  }

  // If lastNotified is null, schedule next from now; else from lastNotified + 1 ms
  const baseTimestamp = animeDoc.lastNotified
    ? DateTime.fromISO(animeDoc.lastNotified).toMillis() + 1
    : Date.now();

  const nextRunTime = getNextScheduleTime(animeDoc.schedule, baseTimestamp);
  const delayMs = nextRunTime - Date.now();

  const safeDelayMs = delayMs > 1000 ? delayMs : 1000 * 60; // At least 1 minute

  const dtNext = DateTime.fromMillis(nextRunTime).toISO();
  console.log(`[Scheduler] ${DateTime.now().toISO()} - Next check for "${title}" scheduled at ${dtNext} (in ${(safeDelayMs / 1000 / 60 / 60).toFixed(2)} hours).`);

  setTimeout(() => runAndReschedule(animeDoc, client), safeDelayMs);
}

/**
 * Calculates the timestamp of the next scheduled episode.
 * 
 * @param {object} schedule - Schedule object with .day (weekday string), .time (HH:mm), and optional .timezone
 * @param {number} fromTimestamp - Milliseconds timestamp to calculate next schedule from
 * @returns {number} Milliseconds timestamp for next scheduled date/time
 */
function getNextScheduleTime(schedule, fromTimestamp = Date.now()) {
  const daysOfWeek = ['Sunday','Monday','Tuesday','Wednesday','Thursday','Friday','Saturday'];

  // Normaliza o dia: tira o 's' final se tiver, e coloca com a primeira letra maiúscula
  let day = schedule.day.trim();
  if (day.toLowerCase().endsWith('s')) {
    day = day.slice(0, -1);
  }
  day = day.charAt(0).toUpperCase() + day.slice(1).toLowerCase();

  const dayIndex = daysOfWeek.indexOf(day);
  if (dayIndex === -1) return fromTimestamp;

  const [hourStr, minStr] = schedule.time.split(':');
  const hour = parseInt(hourStr, 10);
  const minute = parseInt(minStr, 10);

  let dt = DateTime.fromMillis(fromTimestamp).setZone(schedule.timezone || 'Asia/Tokyo');
  dt = dt.set({ hour, minute, second: 0, millisecond: 0 });

  const currentWeekday = dt.weekday % 7;
  let daysToAdd = (dayIndex - currentWeekday + 7) % 7;

  if (daysToAdd === 0 && dt.toMillis() <= fromTimestamp) {
    daysToAdd = 7;
  }

  dt = dt.plus({ days: daysToAdd });
  return dt.toMillis();
}

module.exports = {
  setupTimersForAnimes,
  scheduleAnime,
  checkAnimeEpisode
};
