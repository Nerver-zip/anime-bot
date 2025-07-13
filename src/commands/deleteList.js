/**
 * Create a new list with up to 15 animes passed as arguments
 */

const { SlashCommandBuilder, EmbedBuilder, MessageFlags, ActionRowBuilder, ButtonBuilder, ButtonStyle, ComponentType } = require('discord.js');

const User = require('../models/User.js');

module.exports = {
    data: new SlashCommandBuilder()
        .setName('delete-list')
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

                // Criar botões de confirmação e cancelamento
                const row = new ActionRowBuilder()
                  .addComponents(
                    new ButtonBuilder()
                      .setCustomId('confirm-delete')
                      .setLabel('Confirm')
                      .setStyle(ButtonStyle.Danger),
                    new ButtonBuilder()
                      .setCustomId('cancel-delete')
                      .setLabel('Cancel')
                      .setStyle(ButtonStyle.Secondary),
                  );
              
                await interaction.editReply({
                  content: `⚠️ Are you sure about deleting **${listName}**? This action cannot be undone.`,
                  components: [row],
                });
            
                const filter = i => i.user.id === userId && ['confirm-delete', 'cancel-delete'].includes(i.customId);
                
                if (!interaction.channel) {
                  return await interaction.editReply({ content: '❌ Unable to start confirmation. Channel not found.' });
                }

                const collector = interaction.channel.createMessageComponentCollector({ filter, time: 15000, componentType: ComponentType.Button });
            
                collector.on('collect', async i => {
                  if (i.customId === 'confirm-delete') {
                    const size = userDoc.lists.get(listName).length;
                    userDoc.lists.delete(listName);
                    await userDoc.save();
                
                    const embed = new EmbedBuilder()
                          .setColor(0x5865F2)
                          .setTitle(`${listName} was successfully deleted`)
                          .setFooter({ text: `${size} ${size === 1 ? 'anime was' : 'animes were'} deleted` });
                
                    await i.update({
                      content: null,
                      embeds: [embed],
                      components: [new ActionRowBuilder()
                        .addComponents(
                          row.components.map(button => button.setDisabled(true))
                        )
                      ]
                    });
                    collector.stop();
                  } 
                  else if (i.customId === 'cancel-delete') {
                    await i.update({
                      content: '❌ Deletion canceled.',
                      components: [new ActionRowBuilder()
                        .addComponents(
                          row.components.map(button => button.setDisabled(true))
                        )
                      ]
                    });
                    collector.stop();
                  }
                });
            
                collector.on('end', async collected => {
                  if (collected.size === 0) {
                    //Disable buttons after expiring
                    const disabledRow = new ActionRowBuilder()
                      .addComponents(
                        row.components.map(button => button.setDisabled(true))
                      );
                  
                    await interaction.editReply({
                      content: '⌛ Confirmation time expired.',
                      embeds: [],
                      components: [disabledRow],
                    });
                  }
                });
        } catch (error) {
          console.error(error);
          await interaction.editReply({ content: '❌ Unexpected error happened.' });
        }
    },
};