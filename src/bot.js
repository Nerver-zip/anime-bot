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
        console.log(`[INFO] The command ${command.data.name} was loaded successfully.`);
    } else {
        console.log(`[WARNING] The command in ${filePath} is missing the "data" or "execute" property.`);
    }
}

// --- Evento de Bot Pronto ---
client.once(Events.ClientReady, readyClient => {
	console.log(`✅ The bot is online as ${readyClient.user.tag}`);
  console.log('[CRON JOB] Bot is online. Verifying episodes.');
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
      await interaction.followUp({ content: 'Unexpected error.', ephemeral: true });
    } else {
      await interaction.reply({ content: 'Unexpected error.', ephemeral: true });
    }
  }
});

const start = async () => {
    try {
        await connectToDB(process.env.MONGO_URI);
        console.log('✅ Successfully connected to MongoDB!');
        client.login(token);
    } catch (error) {
        console.error('❌ Could not start bot:', error);
    }
};

start();