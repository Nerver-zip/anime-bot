const connectToDB = require('./db/connect.js');
const dotenv = require('dotenv');
dotenv.config();

const fs = require('node:fs');
const path = require('node:path');
const { Client, Collection, Events, GatewayIntentBits } = require('discord.js');
const checkNewEpisodes = require('./utils/checkNewEpisodes.js');

const token = process.env.DISCORD_TOKEN;

const client = new Client({ intents: [GatewayIntentBits.Guilds] });

client.commands = new Collection();
const commandsPath = path.join(__dirname, 'commands');
const commandFiles = fs.readdirSync(commandsPath).filter(file => file.endsWith('.js'));

for (const file of commandFiles) {
    const filePath = path.join(commandsPath, file);
    const command = require(filePath);
    if ('data' in command && 'execute' in command) {
        client.commands.set(command.data.name, command);
        console.log(`[INFO] O comando ${command.data.name} foi carregado com sucesso.`);
    } else {
        console.log(`[AVISO] O comando em ${filePath} está faltando a propriedade "data" ou "execute".`);
    }
}

// --- Evento de Bot Pronto ---
client.once(Events.ClientReady, readyClient => {
	console.log(`✅ O bot está online como ${readyClient.user.tag}`);
  console.log('[CRON JOB] Bot online. Rodando verificação de episódios.');
    checkNewEpisodes(readyClient);
    // Configura para rodar busca de novos eps a cada 30 minutos a partir de agora.
    setInterval(() => checkNewEpisodes(readyClient), 1800000); 
});


// --- Listener de Interação ---
client.on('interactionCreate', async interaction => {
  const command = client.commands.get(interaction.commandName);
  if (!command) return;

  try {
    // Trata autocomplete
    if (interaction.isAutocomplete()) {
      if (command.autocomplete) {
        await command.autocomplete(interaction);
      }
      return;
    }

    // Trata slash command normal
    if (interaction.isChatInputCommand()) {
      await command.execute(interaction);
    }
  } catch (error) {
    console.error(error);
    if (interaction.replied || interaction.deferred) {
      await interaction.followUp({ content: 'Erro inesperado.', ephemeral: true });
    } else {
      await interaction.reply({ content: 'Erro inesperado.', ephemeral: true });
    }
  }
});

const start = async () => {
    try {
        await connectToDB(process.env.MONGO_URI);
        console.log('✅ Conectado ao MongoDB com sucesso!');
        client.login(token);
    } catch (error) {
        console.error('❌ Falha ao iniciar o bot:', error);
    }
};

start();