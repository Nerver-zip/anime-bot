const Anime = require('./models/Anime.js');
const { DateTime } = require('luxon');
const checkAnimeEpisode = require('./utils/checkAnimeEpisode.js');

/**
 * Inicializa o agendamento para todos os animes no DB ao iniciar o bot.
 * @param {Discord.Client} client
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
 * Agenda o próximo check de um anime individual.
 * @param {Object} animeDoc - Documento mongoose do anime
 * @param {Discord.Client} client
 */
function scheduleAnime(animeDoc, client) {
  const { title, schedule, lastNotified } = animeDoc;

  if (!schedule || !schedule.day || !schedule.time) {
    console.warn(`[Scheduler] ${DateTime.now().toISO()} - Anime "${title}" ignored due to invalid schedule.`);
    return;
  }

  const baseDate = lastNotified instanceof Date
    ? DateTime.fromJSDate(lastNotified)
    : DateTime.now();

  const nextRunTime = getNextScheduleTime(schedule, baseDate.plus({ milliseconds: 1 }).toMillis());

  if (!nextRunTime) {
    console.warn(`[Scheduler] ${DateTime.now().toISO()} - "${title}" has invalid schedule, skipping.`);
    return;
  }

  const delayMs = nextRunTime - Date.now();
  const dtNext = DateTime.fromMillis(nextRunTime).toISO();

  console.log(`[Scheduler] ${DateTime.now().toISO()} - "${title}" will be checked at ${dtNext} (delay: ${(delayMs / 60000).toFixed(2)} min)`);

  if (delayMs <= 0) {
    console.warn(`[Scheduler] ${DateTime.now().toISO()} - "${title}" time has passed. Checking immediately.`);
    runAndReschedule(animeDoc, client);
  } else {
    setTimeout(() => runAndReschedule(animeDoc, client), delayMs);
  }
}

/**
 * Executa a verificação e agenda o próximo check.
 * @param {Object} animeDoc
 * @param {Discord.Client} client
 */
async function runAndReschedule(animeDoc, client) {
  const title = animeDoc.title;
  console.log(`[Scheduler] ${DateTime.now().toISO()} - Running check for "${title}"...`);

  try {
    await checkAnimeEpisode(animeDoc, client);
    animeDoc.lastNotified = new Date(); // garante Date, não ISO string
    await animeDoc.save();
    console.log(`[Scheduler] ${DateTime.now().toISO()} - Check completed for "${title}".`);
  } catch (err) {
    console.error(`[Scheduler] ${DateTime.now().toISO()} - Error checking episode for "${title}":`, err);
  }

  const baseTimestamp = DateTime.now().toMillis() + 1;
  const nextRunTime = getNextScheduleTime(animeDoc.schedule, baseTimestamp);

  if (!nextRunTime) {
    console.warn(`[Scheduler] Invalid nextRunTime for "${animeDoc.title}", scheduling retry in 1 hour.`);
    setTimeout(() => runAndReschedule(animeDoc, client), 1000 * 60 * 60);
    return;
  }

  let delayMs = nextRunTime - Date.now();

  if (delayMs < 0) {
    console.warn(`[Scheduler] NextRunTime is in the past for "${animeDoc.title}", scheduling retry in 1 minute.`);
    delayMs = 1000 * 60;
  }

  const dtNext = DateTime.fromMillis(nextRunTime).toISO();
  console.log(`[Scheduler] ${DateTime.now().toISO()} - Next check for "${animeDoc.title}" scheduled at ${dtNext} (in ${(delayMs / 60000).toFixed(2)} min).`);

  setTimeout(() => runAndReschedule(animeDoc, client), delayMs);
}

/**
 * Calcula timestamp do próximo horário programado baseado no dia e hora.
 * @param {Object} schedule { day: string, time: string, timezone?: string }
 * @param {number} fromTimestamp - timestamp em ms para calcular a partir dele
 * @returns {number|null} timestamp em ms ou null se erro
 */
function getNextScheduleTime(schedule, fromTimestamp = Date.now()) {
  const daysOfWeek = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'];

  let day = schedule.day.trim().toLowerCase();
  if (day.endsWith('s')) day = day.slice(0, -1);
  day = day.charAt(0).toUpperCase() + day.slice(1);

  const dayIndex = daysOfWeek.indexOf(day);
  if (dayIndex === -1) {
    console.warn(`[Scheduler] getNextScheduleTime - Invalid weekday "${schedule.day}" normalized to "${day}"`);
    return null;
  }

  const [hourStr, minStr] = schedule.time.split(':');
  const hour = parseInt(hourStr, 10);
  const minute = parseInt(minStr, 10);

  if (isNaN(hour) || isNaN(minute)) {
    console.warn(`[Scheduler] getNextScheduleTime - Invalid time format: "${schedule.time}"`);
    return null;
  }

  const zone = schedule.timezone || 'Asia/Tokyo';
  const from = DateTime.fromMillis(fromTimestamp).setZone(zone);
  const targetTimeToday = from.set({ hour, minute, second: 0, millisecond: 0 });

  const currentWeekday = from.weekday % 7; // 0 (Sunday) a 6 (Saturday)
  let daysToAdd = (dayIndex - currentWeekday + 7) % 7;

  // Se for hoje e o horário ainda não passou, mantém hoje
  if (daysToAdd === 0 && targetTimeToday > from) {
    return targetTimeToday.toMillis();
  }

  const nextTime = targetTimeToday.plus({ days: daysToAdd || 7 }); // se daysToAdd = 0 e hora já passou, joga pra próxima semana
  console.log(`[Scheduler] getNextScheduleTime - next scheduled time: ${nextTime.toISO()}`);

  return nextTime.toMillis();
}

module.exports = {
  setupTimersForAnimes,
  scheduleAnime,
  checkAnimeEpisode
};
