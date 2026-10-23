const { Client, GatewayIntentBits, EmbedBuilder } = require('discord.js');
const express = require('express');

// Servidor web simple para que Render mantenga el servicio activo
const app = express();
const PORT = process.env.PORT || 3000;
app.get('/', (req, res) => res.send('¡El bot de Discord está activo!'));
app.listen(PORT, () => console.log(`Servidor web corriendo en puerto ${PORT}`));

// Configuración del Bot de Discord
const client = new Client({
    intents: [
        GatewayIntentBits.Guilds,
        GatewayIntentBits.GuildMessages,
        GatewayIntentBits.MessageContent
    ]
});

client.once('ready', () => {
    console.log(`¡Conectado exitosamente como ${client.user.tag}!`);
});

client.on('messageCreate', message => {
    // Evitar que el bot se responda a sí mismo
    if (message.author.bot) return;

    // Comando de prueba anterior (!ping)
    if (message.content === '!ping') {
        message.reply('¡Pong desde Render! 🚀 El bot funciona 24/7.');
    }

    // Nuevo comando para enviar un Embed
    if (message.content === '!embed') {
        const miEmbed = new EmbedBuilder()
            .setColor(0x0099FF) // Color de la barra lateral (azul en Hexadecimal)
            .setTitle('✨ ¡Hola desde mi bot en Render!')
            .setDescription('Este es un mensaje elegante tipo **embed** enviado directamente desde el código en Node.js.')
            .addFields(
                { name: '📌 ¿Cómo funciona?', value: 'Responde a comandos personalizados con un diseño limpio.', inline: false },
                { name: '⚡ Estado', value: 'En línea 24/7', inline: true },
                { name: '📱 Creado desde', value: 'Android', inline: true }
            )
            .setThumbnail(client.user.displayAvatarURL()) // Muestra la foto de perfil de tu bot
            .setTimestamp() // Pone la hora actual abajo
            .setFooter({ text: 'Sistema de embeds de tu bot', iconURL: message.author.displayAvatarURL() });

        // Envía el embed como respuesta al mensaje
        message.reply({ embeds: [miEmbed] });
    }
});

client.login(process.env.TOKEN);
