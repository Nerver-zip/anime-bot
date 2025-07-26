/**
 * Print all user's anime lists
 * -> Anime list name (x/15)
 */
const {
  SlashCommandBuilder,
  EmbedBuilder,
  AttachmentBuilder,
  MessageFlags
} = require('discord.js');

const path = require('path');

const User = require('../models/User.js');
const fetchAnimeList = require('../utils/fetchAnimeList.js');

module.exports = {
  data: new SlashCommandBuilder()
    .setName('my-lists')
    .setDescription('Check out your current anime lists'),

  async execute(interaction) {
    try {
      await interaction.deferReply({ flags: MessageFlags.Ephemeral });

      const userId = interaction.user.id;
      const query = {user_id: userId};

      const userDoc = await User.findOne(query);

      if (!userDoc) {
          return await interaction.editReply({
            content: `🚫 User not found. Add an anime to a list to get started!`
          });
      }

      const userLists = [...userDoc.lists.keys()].filter(key => key !== 'notifyList');
          
      if (!userLists || userLists.length === 0) {
        return await interaction.editReply({
          content: `You don't have any animes added to lists yet. Use createList to get started!`
        });
      }
      
      const size = userLists.length;
      const listLines = userLists.slice(0, 15).map((name, index) => {
        const listSize = userDoc.lists.get(name)?.length || 0;
        return `**${index + 1}** ${name} (${listSize}/15)`;
      });

      const embed = new EmbedBuilder()
        .setColor(0x5865F2)
        .setTitle(`📺 You have ${size} anime(s) list(s)`)
        .setDescription(listLines.join('\n'));

      await interaction.editReply({
        embeds: [embed]
      });
    } 
    catch (error) {
      console.error(error);
      await interaction.editReply({
        content: '❌ An unexpected error occurred.'
      });
    }
  },
};
