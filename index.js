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
    bienvenida: null,
    despedida: null,
    logs: null
};

// Helper para enviar registros al canal de Logs
async function enviarLog(guild, embed) {
    if (!configCanales.logs) return;
    const logChannel = guild.channels.cache.get(configCanales.logs);
    if (logChannel) {
        await logChannel.send({ embeds: [embed] }).catch(() => {});
    }
}

// Función helper para convertir formatos de tiempo (1d, 1h, 3m) a milisegundos
function parsearTiempo(tiempoStr) {
    if (!tiempoStr) return null;
    const regex = /(\d+)\s*([dhm])/gi;
    let duracionMs = 0;
    let match;

    while ((match = regex.exec(tiempoStr)) !== null) {
        const valor = parseInt(match[1]);
        const unidad = match[2].toLowerCase();

        if (unidad === 'd') duracionMs += valor * 24 * 60 * 60 * 1000;
        else if (unidad === 'h') duracionMs += valor * 60 * 60 * 1000;
        else if (unidad === 'm') duracionMs += valor * 60 * 1000;
    }

    return duracionMs > 0 ? duracionMs : null;
}

client.once('ready', () => {
    console.log(`¡Kyle Bot se ha conectado como ${client.user.tag}!`);
    client.user.setActivity('Servidor | !help', { type: 0 });
});

// ==========================================
// 1. SISTEMA DE BIENVENIDAS Y DESPEDIDAS
// ==========================================

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

    const embedLog = new EmbedBuilder()
        .setTitle('📥 Nuevo Miembro')
        .setDescription(`${member.user.tag} (${member.id}) se ha unido al servidor.`)
        .setColor('#57f287')
        .setTimestamp();
    enviarLog(member.guild, embedLog);
});

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

    const embedLog = new EmbedBuilder()
        .setTitle('📤 Miembro Saliente')
        .setDescription(`${member.user.tag} (${member.id}) ha salido del servidor.`)
        .setColor('#ed4245')
        .setTimestamp();
    enviarLog(member.guild, embedLog);
});

// ==========================================
// 2. ATENCIÓN A COMANDOS CON PREFIJO (!)
// ==========================================

client.on('messageCreate', async (message) => {
    // Prefijo configurado a !
    const PREFIX = "!";

    if (message.author.bot || !message.content.startsWith(PREFIX)) return;

    const args = message.content.slice(PREFIX.length).trim().split(/ +/);
    const command = args.shift().toLowerCase();

    // --- COMANDO: !help ---
    if (command === 'help') {
        const embedHelp = new EmbedBuilder()
            .setTitle('🤖 Menú de Ayuda - Kyle Bot')
            .setDescription(`Mi prefijo en este servidor es **\`${PREFIX}\`**`)
            .setColor('#5865f2')
            .addFields(
                { 
                    name: '📩 Mensajes Embed', 
                    value: `\`!embed Título | Descripción | #Color\`\nCrea un anuncio en formato Embed.` 
                },
                { 
                    name: '⚙️ Configuración (Admin)', 
                    value: `\`!bienvenida #canal\`\n\`!despedida #canal\`\n\`!logs #canal\`` 
                },
                { 
                    name: '🛡️ Moderación', 
                    value: `\`!mute <@usuario> <tiempo> [razón]\` - Aísla a un usuario (Ej: 1d 1h 3m).\n\`!clear <1-100>\` - Elimina mensajes masivamente.\n\`!kick <@usuario> [razón]\` - Expulsa a un miembro.\n\`!ban <@usuario> [razón]\` - Banea a un miembro.` 
                }
            )
            .setFooter({ text: 'Kyle Bot - Sistema de Gestión', iconURL: client.user.displayAvatarUrl() })
            .setTimestamp();

        return message.channel.send({ embeds: [embedHelp] });
    }

    // --- COMANDO: !embed ---
    if (command === 'embed') {
        const contenido = args.join(' ');
        const partes = contenido.split('|');

        if (!partes[0] || !partes[1]) {
            return message.reply('❌ Uso correcto: `!embed Título | Descripción | #Color`');
        }

        const titulo = partes[0].trim();
        const descripcion = partes[1].trim();
        let color = partes[2] ? partes[2].trim() : '#5865f2';

        if (!/^#([0-9A-F]{3}){1,2}$/i.test(color)) {
            color = '#5865f2';
        }

        const customEmbed = new EmbedBuilder()
            .setTitle(titulo)
            .setDescription(descripcion)
            .setColor(color)
            .setFooter({ text: `Enviado por: ${message.author.tag}`, iconURL: message.author.displayAvatarUrl() })
            .setTimestamp();

        return message.channel.send({ embeds: [customEmbed] });
    }

    // --- COMANDO: !mute ---
    if (command === 'mute') {
        if (!message.member.permissions.has(PermissionFlagsBits.ModerateMembers)) {
            return message.reply('❌ No tienes permiso para aislar/silenciar miembros.');
        }

        const userToMute = message.mentions.members.first();
        if (!userToMute) {
            return message.reply('⚠️ Uso correcto: `!mute <@usuario> <tiempo> [razón]`\nEjemplo: `!mute @usuario 1d1h3m Mal comportamiento`');
        }

        if (!userToMute.moderatable) {
            return message.reply('❌ No puedo silenciar a este usuario.');
        }

        const argsSinUser = args.slice(1).join(' ');
        const tiempoMs = parsearTiempo(argsSinUser);

        if (!tiempoMs) {
            return message.reply('⚠️ Especifica un tiempo válido usando **d**, **h** o **m**.\nEjemplos: `10m`, `2h`, `1d`, `1d1h3m`');
        }

        const maxTiempo = 28 * 24 * 60 * 60 * 1000;
        if (tiempoMs > maxTiempo) {
            return message.reply('⚠️ El tiempo máximo permitido por Discord es de 28 días.');
        }

        const razon = argsSinUser.replace(/(\d+)\s*([dhm])/gi, '').trim() || 'Sin razón especificada';

        await userToMute.timeout(tiempoMs, razon);
        message.channel.send(`🔇 **${userToMute.user.tag}** ha sido silenciado correctamente.`);

        const log = new EmbedBuilder()
            .setTitle('🔇 Miembro Silenciado (Mute)')
            .setColor('#f1c40f')
            .addFields(
                { name: 'Usuario', value: `${userToMute.user.tag}`, inline: true },
                { name: 'Moderador', value: `${message.author.tag}`, inline: true },
                { name: 'Duración', value: argsSinUser.match(/(\d+)\s*([dhm])/gi).join(' '), inline: true },
                { name: 'Razón', value: razon }
            )
            .setTimestamp();
        enviarLog(message.guild, log);
    }

    // --- COMANDO: !bienvenida #canal ---
    if (command === 'bienvenida') {
        if (!message.member.permissions.has(PermissionFlagsBits.Administrator)) {
            return message.reply('❌ Necesitas permisos de Administrador.');
        }
        const canal = message.mentions.channels.first();
        if (!canal) return message.reply('⚠️ Menciona el canal: `!bienvenida #canal`');
        configCanales.bienvenida = canal.id;
        return message.reply(`✅ Canal de bienvenidas configurado en ${canal}`);
    }

    // --- COMANDO: !despedida #canal ---
    if (command === 'despedida') {
        if (!message.member.permissions.has(PermissionFlagsBits.Administrator)) {
            return message.reply('❌ Necesitas permisos de Administrador.');
        }
        const canal = message.mentions.channels.first();
        if (!canal) return message.reply('⚠️ Menciona el canal: `!despedida #canal`');
        configCanales.despedida = canal.id;
        return message.reply(`✅ Canal de despedidas configurado en ${canal}`);
    }

    // --- COMANDO: !logs #canal ---
    if (command === 'logs') {
        if (!message.member.permissions.has(PermissionFlagsBits.Administrator)) {
            return message.reply('❌ Necesitas permisos de Administrador.');
        }
        const canal = message.mentions.channels.first();
        if (!canal) return message.reply('⚠️ Menciona el canal: `!logs #canal`');
        configCanales.logs = canal.id;
        return message.reply(`✅ Canal de logs configurado en ${canal}`);
    }

    // --- COMANDO: !clear ---
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

    // --- COMANDO: !kick ---
    if (command === 'kick') {
        if (!message.member.permissions.has(PermissionFlagsBits.KickMembers)) return;
        const userToKick = message.mentions.members.first();
        if (!userToKick || !userToKick.kickable) return message.reply('❌ No se puede expulsar al usuario.');
        const razon = args.slice(1).join(' ') || 'Sin razón especificada';
        await userToKick.kick(razon);
        message.channel.send(`✅ **${userToKick.user.tag}** expulsado.`);

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

    // --- COMANDO: !ban ---
    if (command === 'ban') {
        if (!message.member.permissions.has(PermissionFlagsBits.BanMembers)) return;
        const userToBan = message.mentions.members.first();
        if (!userToBan || !userToBan.bannable) return message.reply('❌ No se puede banear al usuario.');
        const razon = args.slice(1).join(' ') || 'Sin razón especificada';
        await userToBan.ban({ reason: razon });
        message.channel.send(`🚫 **${userToBan.user.tag}** baneado.`);

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
        
