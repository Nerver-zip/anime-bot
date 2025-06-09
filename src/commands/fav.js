const { SlashCommandBuilder } = require('discord.js');
const Anime = require('../models/Anime');

module.exports = {
  data: new SlashCommandBuilder()
    .setName('favoritar')
    .setDescription('Adiciona um anime à sua lista de favoritos')
    .addStringOption(option =>
      option.setName('titulo').setDescription('Nome do anime').setRequired(true)
    ),

  async execute(interaction) {
    const titulo = interaction.options.getString('titulo');
    const userId = interaction.user.id;

    try {
      let anime = await Anime.findOne({ titulo });

      if (!anime) {
        anime = new Anime({ titulo, favoritado_por: [userId] });
      } else if (!anime.favoritado_por.includes(userId)) {
        anime.favoritado_por.push(userId);
      }

      await anime.save();

      await interaction.reply(`${titulo} foi adicionado aos seus favoritos!`);
    } catch (err) {
      console.error(err);
      await interaction.reply('❌ Ocorreu um erro ao favoritar o anime.');
    }
  },
};
