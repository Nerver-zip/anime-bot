const connectToDB = require('./db/connect.js'); // Sua função de conexão com o DB
const dotenv = require('dotenv');
dotenv.config(); // Carrega as variáveis do arquivo .env

const fs = require('node:fs');
const path = require('node:path');
const { Client, Collection, Events, GatewayIntentBits } = require('discord.js');

// Pega o token do arquivo .env
const token = process.env.DISCORD_TOKEN;

// Cria uma nova instância do cliente do bot
// GatewayIntentBits.Guilds é o mínimo necessário para o bot funcionar
const client = new Client({ intents: [GatewayIntentBits.Guilds] });

// --- Carregador de Comandos ---
// Cria uma coleção no cliente para armazenar os comandos e seus respectivos códigos
client.commands = new Collection();
const commandsPath = path.join(__dirname, 'commands');
const commandFiles = fs.readdirSync(commandsPath).filter(file => file.endsWith('.js'));

for (const file of commandFiles) {
    const filePath = path.join(commandsPath, file);
    const command = require(filePath);
    // Verifica se o comando carregado tem as propriedades 'data' e 'execute'
    if ('data' in command && 'execute' in command) {
        client.commands.set(command.data.name, command);
        console.log(`[INFO] O comando ${command.data.name} foi carregado com sucesso.`);
    } else {
        console.log(`[AVISO] O comando em ${filePath} está faltando a propriedade "data" ou "execute".`);
    }
}

// --- Evento de Bot Pronto ---
client.once(Events.ClientReady, c => {
    console.log(`✅ O bot está online como ${c.user.tag}`);
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


// --- Função Principal de Inicialização ---
const start = async () => {
    try {
        // 1. Conecta ao Banco de Dados
        await connectToDB(process.env.MONGO_URI);
        console.log('✅ Conectado ao MongoDB com sucesso!');

        // 2. Faz o login do bot no Discord
        client.login(token);

    } catch (error) {
        console.error('❌ Falha ao iniciar o bot:', error);
    }
};

start();