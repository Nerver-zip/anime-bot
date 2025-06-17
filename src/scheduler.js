const Anime = require('./models/Anime.js');
const { DateTime } = require('luxon');
const checkAnimeEpisode = require('./utils/checkAnimeEpisode.js');

/**
 * Configura todos os agendamentos no início.
 * @param {Discord.Client} client - instância do client Discord para enviar mensagens.
 */
async function setupTimersForAnimes(client) {
  const animes = await Anime.find({});
  animes.forEach(animeDoc => scheduleAnime(animeDoc, client));
}

/**
 * Agenda um anime individualmente.
 * @param {Object} animeDoc - Documento do anime no MongoDB.
 * @param {Discord.Client} client - Instância do bot Discord.
 */
function scheduleAnime(animeDoc, client) {
  const { schedule } = animeDoc;
  if (!schedule || !schedule.day || !schedule.time) return;

  const nextRunTime = getNextScheduleTime(schedule);
  const delayMs = nextRunTime - Date.now();

  if (delayMs <= 0) {
    runAndReschedule(animeDoc, client);
  } else {
    setTimeout(() => runAndReschedule(animeDoc, client), delayMs);
  }
}

/**
 * Executa o check e agenda o próximo.
 */
async function runAndReschedule(animeDoc, client) {
  try {
    await checkAnimeEpisode(animeDoc, client);
  } catch (err) {
    console.error(`Error checking episode for ${animeDoc.title}:`, err);
  }

  const oneWeekMs = 7 * 24 * 60 * 60 * 1000;
  const nextRunTime = getNextScheduleTime(animeDoc.schedule, Date.now() + oneWeekMs);
  const delayMs = nextRunTime - Date.now();

  setTimeout(() => runAndReschedule(animeDoc, client), delayMs);
}

/**
 * Calcula o timestamp do próximo episódio.
 */
function getNextScheduleTime(schedule, fromTimestamp = Date.now()) {
  const daysOfWeek = ['Sunday','Monday','Tuesday','Wednesday','Thursday','Friday','Saturday'];
  const dayIndex = daysOfWeek.indexOf(schedule.day);
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
