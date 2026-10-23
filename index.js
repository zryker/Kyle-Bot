const { Client, GatewayIntentBits, EmbedBuilder, PermissionFlagsBits } = require('discord.js');
const express = require('express');

// --- Servidor Web para Render ---
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

// Guardado en memoria de los canales configurados
const configCanales = {
    bienvenida: null, // Guardará la ID del canal
    despedida: null,
    logs: null
};

// Helper para enviar registros al canal de Logs si está configurado
async function enviarLog(guild, embed) {
    if (!configCanales.logs) return;
    const logChannel = guild.channels.cache.get(configCanales.logs);
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

// Evento: Entrada de usuario
client.on('guildMemberAdd', async (member) => {
    if (configCanales.bienvenida) {
        const channel = member.guild.channels.cache.get(configCanales.bienvenida);
        if (channel) {
            const embedBienvenida = new EmbedBuilder()
                .setTitle(`¡Bienvenido/a a ${member.guild.name}! 🎉`)
                .setDescription(`Hola ${member}, ¡estamos felices de tenerte aquí! Pásala excelente.`)
                .setColor('#2b2d31')
                .setThumbnail(member.user.displayAvatarUrl({ dynamic: true }))
                .setFooter({ text: `Miembro #${member.guild.memberCount}` })
                .setTimestamp();

            await channel.send({ embeds: [embedBienvenida] }).catch(() => {});
        }
    }

    // Log de entrada
    const embedLog = new EmbedBuilder()
        .setTitle('📥 Nuevo Miembro')
        .setDescription(`${member.user.tag} (${member.id}) se ha unido al servidor.`)
        .setColor('#57f287')
        .setTimestamp();
    enviarLog(member.guild, embedLog);
});

// Evento: Salida de usuario
client.on('guildMemberRemove', async (member) => {
    if (configCanales.despedida) {
        const channel = member.guild.channels.cache.get(configCanales.despedida);
        if (channel) {
            const embedDespedida = new EmbedBuilder()
                .setTitle('Un usuario se ha ido 😢')
                .setDescription(`Lamentamos ver salir a **${member.user.tag}**. ¡Esperamos volver a verte!`)
                .setColor('#ed4245')
                .setThumbnail(member.user.displayAvatarUrl({ dynamic: true }))
                .setTimestamp();

            await channel.send({ embeds: [embedDespedida] }).catch(() => {});
        }
    }

    // Log de salida
    const embedLog = new EmbedBuilder()
        .setTitle('📤 Miembro Saliente')
        .setDescription(`${member.user.tag} (${member.id}) ha salido del servidor.`)
        .setColor('#ed4245')
        .setTimestamp();
    enviarLog(member.guild, embedLog);
});

// ==========================================
// 2. COMANDOS DEL BOT
// ==========================================

client.on('messageCreate', async (message) => {
    if (message.author.bot || !message.content.startsWith('!')) return;

    const args = message.content.slice(1).trim().split(/ +/);
    const command = args.shift().toLowerCase();

    // --- COMANDO: !embed ---
    // Uso: !embed Título | Descripción | #Color
    if (command === 'embed') {
        const contenido = args.join(' ');
        const partes = contenido.split('|');

        if (!partes[0] || !partes[1]) {
            return message.reply('❌ Uso correcto: `!embed Título | Descripción | #Color`');
        }

        const titulo = partes[0].trim();
        const descripcion = partes[1].trim();
        let color = partes[2] ? partes[2].trim() : '#5865f2';

        // Validar que el color sea hex válido
        if (!/^#([0-9A-F]{3}){1,2}$/i.test(color)) {
            color = '#5865f2'; // Si escriben un color mal, usa azul por defecto
        }

        const customEmbed = new EmbedBuilder()
            .setTitle(titulo)
            .setDescription(descripcion)
            .setColor(color)
            .setFooter({ text: `Enviado por: ${message.author.tag}`, iconURL: message.author.displayAvatarUrl() })
            .setTimestamp();

        // Borra el mensaje original del usuario para que solo quede el embed
        await message.delete().catch(() => {});
        return message.channel.send({ embeds: [customEmbed] });
    }

    // --- COMANDO: !bienvenida #canal ---
    if (command === 'bienvenida') {
        if (!message.member.permissions.has(PermissionFlagsBits.Administrator)) {
            return message.reply('❌ Necesitas permisos de Administrador para usar este comando.');
        }

        const canalMencionado = message.mentions.channels.first();
        if (!canalMencionado) {
            return message.reply('⚠️ Menciona el canal donde deseas las bienvenidas. Ejemplo: `!bienvenida #bienvenidas`');
        }

        configCanales.bienvenida = canalMencionado.id;
        return message.reply(`✅ Canal de bienvenidas configurado exitosamente en ${canalMencionado}`);
    }

    // --- COMANDO: !despedida #canal ---
    if (command === 'despedida') {
        if (!message.member.permissions.has(PermissionFlagsBits.Administrator)) {
            return message.reply('❌ Necesitas permisos de Administrador para usar este comando.');
        }

        const canalMencionado = message.mentions.channels.first();
        if (!canalMencionado) {
            return message.reply('⚠️ Menciona el canal donde deseas las despedidas. Ejemplo: `!despedida #despedidas`');
        }

        configCanales.despedida = canalMencionado.id;
        return message.reply(`✅ Canal de despedidas configurado exitosamente en ${canalMencionado}`);
    }

    // --- COMANDO: !logs #canal ---
    if (command === 'logs') {
        if (!message.member.permissions.has(PermissionFlagsBits.Administrator)) {
            return message.reply('❌ Necesitas permisos de Administrador para usar este comando.');
        }

        const canalMencionado = message.mentions.channels.first();
        if (!canalMencionado) {
            return message.reply('⚠️ Menciona el canal donde deseas los registros. Ejemplo: `!logs #logs`');
        }

        configCanales.logs = canalMencionado.id;
        return message.reply(`✅ Canal de logs configurado exitosamente en ${canalMencionado}`);
    }

    // --- COMANDOS DE MODERACIÓN (clear, kick, ban) ---
    if (command === 'clear') {
        if (!message.member.permissions.has(PermissionFlagsBits.ManageMessages)) {
            return message.reply('❌ No tienes permiso para borrar mensajes.');
        }
        const cantidad = parseInt(args[0]);
        if (isNaN(cantidad) || cantidad < 1 || cantidad > 100) {
            return message.reply('⚠️ Indica una cantidad entre 1 y 100.');
        }
        await message.channel.bulkDelete(cantidad, true);
        const reply = await message.channel.send(`🧹 Se han eliminado ${cantidad} mensajes.`);
        setTimeout(() => reply.delete().catch(() => {}), 3000);
    }

    if (command === 'kick') {
        if (!message.member.permissions.has(PermissionFlagsBits.KickMembers)) return;
        const userToKick = message.mentions.members.first();
        if (!userToKick || !userToKick.kickable) return message.reply('❌ No se puede expulsar al usuario.');
        const razon = args.slice(1).join(' ') || 'Sin razón';
        await userToKick.kick(razon);
        message.channel.send(`✅ **${userToKick.user.tag}** expulsado.`);
    }

    if (command === 'ban') {
        if (!message.member.permissions.has(PermissionFlagsBits.BanMembers)) return;
        const userToBan = message.mentions.members.first();
        if (!userToBan || !userToBan.bannable) return message.reply('❌ No se puede banear al usuario.');
        const razon = args.slice(1).join(' ') || 'Sin razón';
        await userToBan.ban({ reason: razon });
        message.channel.send(`🚫 **${userToBan.user.tag}** baneado.`);
    }
});

client.login(process.env.TOKEN);
