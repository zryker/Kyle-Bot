const { Client, GatewayIntentBits, EmbedBuilder, PermissionFlagsBits } = require('discord.js');
const express = require('express');

// --- Servidor Web de soporte para Render ---
const app = express();
const PORT = process.env.PORT || 3000;
app.get('/', (req, res) => res.send('Kyle Bot está en línea 🚀'));
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

// Nombres de los canales del servidor (Asegúrate de crearlos en tu servidor de Discord)
const CANAL_BIENVENIDAS = 'bienvenidas';
const CANAL_DESPEDIDAS = 'despedidas';
const CANAL_LOGS = 'logs';

// Helper para enviar registros al canal de Logs
async function enviarLog(guild, embed) {
    const logChannel = guild.channels.cache.find(c => c.name === CANAL_LOGS);
    if (logChannel) {
        await logChannel.send({ embeds: [embed] }).catch(() => {});
    }
}

client.once('ready', () => {
    console.log(`¡Kyle Bot se ha conectado como ${client.user.tag}!`);
    client.user.setActivity('Servidor | !help', { type: 0 });
});

// ==========================================
// 1. SISTEMA DE BIENVENIDAS Y DESPEDIDAS
// ==========================================

// Evento: Usuario entra al servidor
client.on('guildMemberAdd', async (member) => {
    const channel = member.guild.channels.cache.find(c => c.name === CANAL_BIENVENIDAS);
    
    const embedBienvenida = new EmbedBuilder()
        .setTitle(`¡Bienvenido/a a ${member.guild.name}! 🎉`)
        .setDescription(`Hola ${member}, ¡estamos felices de tenerte aquí! Pásala excelente.`)
        .setColor('#2b2d31')
        .setThumbnail(member.user.displayAvatarUrl({ dynamic: true }))
        .setFooter({ text: `Miembro #${member.guild.memberCount}` })
        .setTimestamp();

    if (channel) await channel.send({ embeds: [embedBienvenida] });

    // Log de entrada
    const embedLog = new EmbedBuilder()
        .setTitle('📥 Nuevo Miembro')
        .setDescription(`${member.user.tag} (${member.id}) se ha unido al servidor.`)
        .setColor('#57f287')
        .setTimestamp();
    enviarLog(member.guild, embedLog);
});

// Evento: Usuario sale del servidor
client.on('guildMemberRemove', async (member) => {
    const channel = member.guild.channels.cache.find(c => c.name === CANAL_DESPEDIDAS);

    const embedDespedida = new EmbedBuilder()
        .setTitle('Un usuario se ha ido 😢')
        .setDescription(`Lamentamos ver salir a **${member.user.tag}**. ¡Esperamos volver a verte!`)
        .setColor('#ed4245')
        .setThumbnail(member.user.displayAvatarUrl({ dynamic: true }))
        .setTimestamp();

    if (channel) await channel.send({ embeds: [embedDespedida] });

    // Log de salida
    const embedLog = new EmbedBuilder()
        .setTitle('📤 Miembro Saliente')
        .setDescription(`${member.user.tag} (${member.id}) ha salido del servidor.`)
        .setColor('#ed4245')
        .setTimestamp();
    enviarLog(member.guild, embedLog);
});

// ==========================================
// 2. COMANDOS Y MENSAJES (MODERACIÓN & EMBEDS)
// ==========================================

client.on('messageCreate', async (message) => {
    if (message.author.bot || !message.content.startsWith('!')) return;

    const args = message.content.slice(1).trim().split(/ +/);
    const command = args.shift().toLowerCase();

    // --- COMANDO: !help ---
    if (command === 'help') {
        const embedHelp = new EmbedBuilder()
            .setTitle('🤖 Comandos de Kyle Bot')
            .setColor('#5865f2')
            .addFields(
                { name: '📩 Embeds', value: '`!embed <Título> | <Descripción> | [Color Hex]`\n*Crea un mensaje bonito con el bot.*' },
                { name: '🛡️ Moderación', value: '`!clear <cantidad>` - Borra mensajes masivamente.\n`!kick <@usuario> [razón]` - Expulsa a un miembro.\n`!ban <@usuario> [razón]` - Banea a un miembro.' }
            )
            .setFooter({ text: 'Kyle Bot - Sistema de Gestión' });
        return message.channel.send({ embeds: [embedHelp] });
    }

    // --- COMANDO: !embed ---
    // Ejemplo: !embed Aviso Importante | Habrá mantenimiento hoy a las 8 PM | #ff0000
    if (command === 'embed') {
        const input = args.join(' ').split('|');
        if (!input[0] || !input[1]) {
            return message.reply('❌ Uso correcto: `!embed Título | Descripción | #ColorOpcional`');
        }

        const titulo = input[0].trim();
        const descripcion = input[1].trim();
        const color = input[2] ? input[2].trim() : '#5865f2';

        const customEmbed = new EmbedBuilder()
            .setTitle(titulo)
            .setDescription(descripcion)
            .setColor(color)
            .setFooter({ text: `Enviado por: ${message.author.tag}`, iconURL: message.author.displayAvatarUrl() })
            .setTimestamp();

        await message.delete().catch(() => {}); // Borra el mensaje original del usuario
        return message.channel.send({ embeds: [customEmbed] });
    }

    // --- COMANDO MODERACIÓN: !clear ---
    if (command === 'clear') {
        if (!message.member.permissions.has(PermissionFlagsBits.ManageMessages)) {
            return message.reply('❌ No tienes permiso para borrar mensajes.');
        }

        const cantidad = parseInt(args[0]);
        if (isNaN(cantidad) || cantidad < 1 || cantidad > 100) {
            return message.reply('⚠️ Debes indicar una cantidad entre 1 y 100.');
        }

        await message.channel.bulkDelete(cantidad, true);
        const reply = await message.channel.send(`🧹 Se han eliminado ${cantidad} mensajes.`);
        setTimeout(() => reply.delete().catch(() => {}), 3000);

        // Registro de Log
        const log = new EmbedBuilder()
            .setTitle('🧹 Mensajes Eliminados')
            .setColor('#fee75c')
            .addFields(
                { name: 'Canal', value: `${message.channel}`, inline: true },
                { name: 'Cantidad', value: `${cantidad}`, inline: true },
                { name: 'Moderador', value: `${message.author.tag}`, inline: true }
            )
            .setTimestamp();
        enviarLog(message.guild, log);
    }

    // --- COMANDO MODERACIÓN: !kick ---
    if (command === 'kick') {
        if (!message.member.permissions.has(PermissionFlagsBits.KickMembers)) {
            return message.reply('❌ No tienes permiso para expulsar miembros.');
        }

        const userToKick = message.mentions.members.first();
        if (!userToKick) return message.reply('⚠️ Menciona al usuario que deseas expulsar.');
        if (!userToKick.kickable) return message.reply('❌ No puedo expulsar a este usuario.');

        const razon = args.slice(1).join(' ') || 'Sin razón especificada';
        await userToKick.kick(razon);
        message.channel.send(`✅ **${userToKick.user.tag}** ha sido expulsado.`);

        // Registro de Log
        const log = new EmbedBuilder()
            .setTitle('👞 Miembro Expulsado')
            .setColor('#ed4245')
            .addFields(
                { name: 'Usuario', value: `${userToKick.user.tag}`, inline: true },
                { name: 'Moderador', value: `${message.author.tag}`, inline: true },
                { name: 'Razón', value: razon }
            )
            .setTimestamp();
        enviarLog(message.guild, log);
    }

    // --- COMANDO MODERACIÓN: !ban ---
    if (command === 'ban') {
        if (!message.member.permissions.has(PermissionFlagsBits.BanMembers)) {
            return message.reply('❌ No tienes permiso para banear miembros.');
        }

        const userToBan = message.mentions.members.first();
        if (!userToBan) return message.reply('⚠️ Menciona al usuario que deseas banear.');
        if (!userToBan.bannable) return message.reply('❌ No puedo banear a este usuario.');

        const razon = args.slice(1).join(' ') || 'Sin razón especificada';
        await userToBan.ban({ reason: razon });
        message.channel.send(`🚫 **${userToBan.user.tag}** ha sido baneado.`);

        // Registro de Log
        const log = new EmbedBuilder()
            .setTitle('🚫 Miembro Baneado')
            .setColor('#ed4245')
            .addFields(
                { name: 'Usuario', value: `${userToBan.user.tag}`, inline: true },
                { name: 'Moderador', value: `${message.author.tag}`, inline: true },
                { name: 'Razón', value: razon }
            )
            .setTimestamp();
        enviarLog(message.guild, log);
    }
});

client.login(process.env.TOKEN);
