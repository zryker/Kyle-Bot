const { Client, GatewayIntentBits, EmbedBuilder, PermissionFlagsBits } = require('discord.js');
const express = require('express');

// --- Servidor Web para Render ---
const app = express();
const PORT = process.env.PORT || 3000;
app.get('/', (req, res) => res.send('Kyle Bot está activo 24/7 🚀'));
app.listen(PORT, () => console.log(`[Kyle Bot] Servidor listo en puerto ${PORT}`));

// --- Configuración del Bot ---
const client = new Client({
    intents: [
        GatewayIntentBits.Guilds,
        GatewayIntentBits.GuildMessages,
        GatewayIntentBits.MessageContent,
        GatewayIntentBits.GuildMembers
    ]
});

// Guardado en memoria
const configCanales = { bienvenida: null, despedida: null, niveles: null, logs: null };
const usuariosXP = {};

client.once('ready', () => {
    console.log(`¡Kyle Bot se ha conectado exitosamente como ${client.user.tag}!`);
    client.user.setActivity('Servidor | !help', { type: 0 });
});

client.on('messageCreate', async (message) => {
    if (message.author.bot) return;

    // --- SISTEMA DE XP Y NIVELES ---
    const userId = message.author.id;
    if (!usuariosXP[userId]) usuariosXP[userId] = { xp: 0, nivel: 1 };
    usuariosXP[userId].xp += Math.floor(Math.random() * 11) + 5;
    const xpNecesaria = usuariosXP[userId].nivel * 100;

    if (usuariosXP[userId].xp >= xpNecesaria) {
        usuariosXP[userId].nivel += 1;
        usuariosXP[userId].xp = 0;

        let canalEnvio = message.channel;
        if (configCanales.niveles) {
            const canalConfig = message.guild.channels.cache.get(configCanales.niveles);
            if (canalConfig) canalEnvio = canalConfig;
        }

        try {
            const embedNivel = new EmbedBuilder()
                .setTitle('🎉 ¡Nivel Alcanzado!')
                .setDescription(`¡Felicidades ${message.author}! Has subido al **Nivel ${usuariosXP[userId].nivel}** 🚀`)
                .setColor('#f1c40f')
                .setTimestamp();
            await canalEnvio.send({ content: `${message.author}`, embeds: [embedNivel] });
        } catch (e) {
            console.error('Error al enviar anuncio de nivel:', e);
        }
    }

    // --- PROCESAR COMANDOS CON ! ---
    const PREFIX = "!";
    if (!message.content.startsWith(PREFIX)) return;

    const args = message.content.slice(PREFIX.length).trim().split(/ +/);
    const command = args.shift().toLowerCase();

    try {
        // --- COMANDO: !help ---
        if (command === 'help') {
            const embedHelp = new EmbedBuilder()
                .setTitle('🤖 Menú de Ayuda - Kyle Bot')
                .setDescription(`Prefijo del bot: **\`${PREFIX}\`**`)
                .setColor('#5865f2')
                .addFields(
                    { name: '📊 Niveles', value: `\`!rank\` - Muestra tu nivel y XP actual.\n\`!nivelchannel #canal\` - Configura el canal de niveles.` },
                    { name: '⚙️ Configuración (Admin)', value: `\`!bienvenida #canal\`\n\`!despedida #canal\`\n\`!logs #canal\`` },
                    { name: '🛡️ Moderación', value: `\`!ban <@usuario> [razón]\`\n\`!unban <ID_Usuario>\`\n\`!mute <@usuario> <tiempo> [razón]\`\n\`!unmute <@usuario>\`\n\`!kick <@usuario> [razón]\`\n\`!clear <1-100>\`` },
                    { name: '📩 Embeds', value: `\`!embed Título | Descripción | #Color\`` }
                )
                .setTimestamp();

            return await message.channel.send({ embeds: [embedHelp] });
        }

        // --- COMANDO: !rank ---
        if (command === 'rank' || command === 'nivel') {
            const datos = usuariosXP[userId] || { xp: 0, nivel: 1 };
            const embedRank = new EmbedBuilder()
                .setTitle(`📊 Perfil de Nivel - ${message.author.username}`)
                .setColor('#2ecc71')
                .addFields(
                    { name: 'Nivel Actual', value: `**${datos.nivel}**`, inline: true },
                    { name: 'Experiencia (XP)', value: `**${datos.xp} / ${datos.nivel * 100}**`, inline: true }
                )
                .setTimestamp();

            return await message.channel.send({ embeds: [embedRank] });
        }

        // --- COMANDO: !clear ---
        if (command === 'clear') {
            const cantidad = parseInt(args[0]);
            if (isNaN(cantidad) || cantidad < 1 || cantidad > 100) {
                return message.reply('⚠️ Indica una cantidad entre 1 y 100. Ejemplo: `!clear 10`');
            }
            await message.channel.bulkDelete(cantidad, true);
            const reply = await message.channel.send(`🧹 Se han eliminado ${cantidad} mensajes.`);
            return setTimeout(() => reply.delete().catch(() => {}), 3000);
        }

        // --- CONFIGURACIÓN DE CANALES ---
        if (command === 'nivelchannel') {
            const canal = message.mentions.channels.first();
            if (!canal) return message.reply('⚠️ Menciona el canal: `!nivelchannel #niveles`');
            configCanales.niveles = canal.id;
            return message.reply(`✅ Subidas de nivel configuradas en ${canal}`);
        }

        if (command === 'bienvenida') {
            const canal = message.mentions.channels.first();
            if (!canal) return message.reply('⚠️ Menciona el canal: `!bienvenida #canal`');
            configCanales.bienvenida = canal.id;
            return message.reply(`✅ Bienvenidas configuradas en ${canal}`);
        }

        if (command === 'despedida') {
            const canal = message.mentions.channels.first();
            if (!canal) return message.reply('⚠️ Menciona el canal: `!despedida #canal`');
            configCanales.despedida = canal.id;
            return message.reply(`✅ Despedidas configuradas en ${canal}`);
        }

        if (command === 'logs') {
            const canal = message.mentions.channels.first();
            if (!canal) return message.reply('⚠️ Menciona el canal: `!logs #canal`');
            configCanales.logs = canal.id;
            return message.reply(`✅ Logs configurados en ${canal}`);
        }

    } catch (error) {
        console.error(`Error ejecutando comando ${command}:`, error);
        message.reply(`❌ Ocurrió un error al ejecutar el comando: \`${error.message}\``);
    }
});

client.login(process.env.TOKEN);
        
