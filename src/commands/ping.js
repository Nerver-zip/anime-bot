const { SlashCommandBuilder } = require('discord.js');

module.exports = {
	// A propriedade 'data' cria a definição do comando para a API do Discord
	data: new SlashCommandBuilder()
		.setName('ping')
		.setDescription('Responde com Pong!'),

	// A propriedade 'execute' contém a lógica que será executada
	async execute(interaction) {
		// interaction.reply() envia a resposta ao comando
		await interaction.reply('Pong! 🏓');
	},
};