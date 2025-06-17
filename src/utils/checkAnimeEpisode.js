const { DateTime } = require('luxon');
const { EmbedBuilder } = require('discord.js');

const TIME_TOLERANCE_MINUTES = 15;

/**
 * Checa se o episódio novo de um anime está para sair e envia notificação
 * @param {Object} animeDoc - Documento mongoose do anime
 * @param {Discord.Client} client - Instância do client Discord para enviar mensagens
 */
async function checkAnimeEpisode(animeDoc, client) {
  const nowJST = DateTime.now().setZone('Asia/Tokyo');
  const { schedule, notify, title, lastNotified, imageUrl } = animeDoc;

  if (!schedule || !schedule.time || !schedule.day) return;

  // Verifica se o dia de hoje é o do schedule
  const weekday = nowJST.toFormat('cccc');
  if (weekday !== schedule.day) return;

  // Valida e define timezone
  const timezone = DateTime.local().setZone(schedule.timezone).isValid
    ? schedule.timezone
    : 'Asia/Tokyo';

  // Horário agendado convertido para DateTime
  const scheduledTime = DateTime.fromFormat(schedule.time, 'HH:mm', { zone: timezone })
    .set({ year: nowJST.year, month: nowJST.month, day: nowJST.day });

  // Se diferença de horário for maior que tolerância, sai
  const diff = Math.abs(nowJST.diff(scheduledTime, 'minutes').minutes);
  if (diff > TIME_TOLERANCE_MINUTES) return;

  // Evita múltiplas notificações no mesmo dia
  const lastNotifiedDate = lastNotified
    ? DateTime.fromJSDate(lastNotified).setZone('Asia/Tokyo')
    : null;
  if (lastNotifiedDate && lastNotifiedDate.hasSame(nowJST, 'day')) return;

  // Cria Embed para notificação
  const embed = new EmbedBuilder()
    .setColor(0x2ecc71)
    .setTitle(`🎬 New Episode: ${title}`)
    .setDescription(`A new episode of **${title}** is airing now!`)
    .setThumbnail(imageUrl || null)
    .setFooter({ text: `Scheduled: ${schedule.day} at ${schedule.time} (${timezone})` })
    .setTimestamp();

  // Envia DM para cada usuário
  for (const userId of notify) {
    try {
      const user = await client.users.fetch(userId);
      await user.send({ embeds: [embed] });
      console.log(`✅ Notified user ${userId} about "${title}"`);
    } catch (err) {
      console.error(`❌ Error notifying user ${userId}:`, err);
    }
  }

  // Atualiza lastNotified para hoje
  animeDoc.lastNotified = nowJST.toJSDate();
  await animeDoc.save();
}

module.exports = checkAnimeEpisode;
