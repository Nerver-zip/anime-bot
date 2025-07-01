/**
 * Create a new list with up to 15 animes passed as arguments
 */

const { SlashCommandBuilder, EmbedBuilder, MessageFlags } = require('discord.js');

const User = require('../models/User.js');

module.exports = {
    data: new SlashCommandBuilder()
        .setName('deleta-list')
        .setDescription('Deletes an anime list')
        .addStringOption(option =>
            option.setName('listname')
                .setDescription('Name of the list to delete')
                .setRequired(true)
                .setAutocomplete(true)
        ),

    async autocomplete(interaction) {
        const focusedValue = interaction.options.getFocused() || ''; 
        try {
            const userId = interaction.user.id;
        
            const userDoc = await User.findOne({ user_id: userId });
            if (!userDoc) return await interaction.respond([]);
        
            const allKeys = Array.from(userDoc.lists.keys());
            
            const filtered = allKeys
                .filter(key => key !== 'notifyList')
                .filter(key => key.toLowerCase().includes(focusedValue.toLowerCase()))
                .slice(0, 25)
            await interaction.respond(
                filtered.map(key => ({ name: key, value: key }))
            );
        } catch (error) {
            console.error('Autocomplete error:', error);
            await interaction.respond([]);
        }
    },

    async execute(interaction) {
        try {
            await interaction.deferReply({flags: MessageFlags.Ephemeral});
            const userId = interaction.user.id;
            const listName = interaction.options.getString('listname');
            
            if (listName === 'notifyList') {
                return await interaction.editReply({
                    content: '❌ You cannot delete this reserved list.'
                });
            }

            const userDoc = await User.findOne({user_id: userId});
            
            if (!userDoc) return;

            if (!userDoc.lists.has(listName)) {
                return await interaction.editReply({
                    content: '❌ This list does not exist.'
                });
            }
            const size = userDoc.lists.get(listName).length;
            userDoc.lists.delete(listName);
            await userDoc.save();

            const embed = new EmbedBuilder()
              .setColor(0x5865F2)
              .setTitle(`${listName} was successfully deleted`)
              .setFooter({ text: `${size} ${size === 1 ? 'anime was' : 'animes were'} deleted` });
    
            await interaction.editReply({embeds: [embed]});
        }
        catch (error) {
          console.error(error);
          await interaction.editReply({
            content: '❌ An unexpected error occurred.'
          });
        }
    },
};