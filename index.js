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

// --- Base de datos en memoria (Canales y Niveles) ---
const configCanales = {
    bienvenida: null,
    despedida: null,
    niveles: null,
    logs: null
};

// Objeto para guardar la experiencia y nivel de los usuarios
const usuariosXP = {}; 
// Estructura: usuariosXP[userId] = { xp: 0, nivel: 1 }

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
    console.log(`¡Kyle Bot se ha conectado exitosamente como ${client.user.tag}!`);
    client.user.setActivity('Servidor | !help', { type: 0 });
});

// ==========================================
// 1. SISTEMA DE BIENVENIDAS Y DESPEDIDAS
// ==========================================

// Entrada de nuevos miembros
client.on('guildMemberAdd', async (member) => {
    if (configCanales.bienvenida) {
        const channel = member.guild.channels.cache.get(configCanales.bienvenida);
        if (channel) {
            const embedBienvenida = new EmbedBuilder()
                .setTitle(`¡Bienvenido/a a ${member.guild.name}! 🎉`)
                .setDescription(`Hola ${member}, ¡estamos muy felices de tenerte aquí! Pásala genial.`)
                .setColor('#5865f2')
                .setThumbnail(member.user.displayAvatarUrl({ dynamic: true }))
                .setFooter({ text: `Miembro #${member.guild.memberCount}` })
                .setTimestamp();

            await channel.send({ content: `¡Bienvenido/a ${member}!`, embeds: [embedBienvenida] }).catch(() => {});
        }
    }

    const embedLog = new EmbedBuilder()
        .setTitle('📥 Nuevo Miembro')
        .setDescription(`${member.user.tag} (${member.id}) se ha unido al servidor.`)
        .setColor('#57f287')
        .setTimestamp();
    enviarLog(member.guild, embedLog);
});

// Salida de miembros
client.on('guildMemberRemove', async (member) => {
    if (configCanales.despedida) {
        const channel = member.guild.channels.cache.get(configCanales.despedida);
        if (channel) {
            const embedDespedida = new EmbedBuilder()
                .setTitle('Un usuario ha salido 😢')
                .setDescription(`Lamentamos ver partir a **${member.user.tag}**. ¡Esperamos volver a verte pronto!`)
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
// 2. SISTEMA DE NIVELES Y COMANDOS (!)
// ==========================================

client.on('messageCreate', async (message) => {
    if (message.author.bot) return;

    // --- MANEJO DE EXPERIENCIA Y NIVELES POR HABLAR ---
    const userId = message.author.id;
    if (!usuariosXP[userId]) {
        usuariosXP[userId] = { xp: 0, nivel: 1 };
    }

    // Otorga entre 5 y 15 de XP por mensaje
    const xpGanada = Math.floor(Math.random() * 11) + 5;
    usuariosXP[userId].xp += xpGanada;

    // Calcular XP requerida para el siguiente nivel
    const xpNecesaria = usuariosXP[userId].nivel * 100;

    if (usuariosXP[userId].xp >= xpNecesaria) {
        usuariosXP[userId].nivel += 1;
        usuariosXP[userId].xp = 0; // Reiniciar o acumular

        const embedNivel = new EmbedBuilder()
            .setTitle('🎉 ¡Nivel Alcanzado!')
            .setDescription(`¡Felicidades ${message.author}! Has subido al **Nivel ${usuariosXP[userId].nivel}** 🚀`)
            .setColor('#f1c40f')
            .setThumbnail(message.author.displayAvatarUrl({ dynamic: true }))
            .setTimestamp();

        // Enviar al canal específico de niveles si está configurado, de lo contrario al canal actual
        let canalEnvio = message.channel;
        if (configCanales.niveles) {
            const canalConfig = message.guild.channels.cache.get(configCanales.niveles);
            if (canalConfig) canalEnvio = canalConfig;
        }

        await canalEnvio.send({ content: `${message.author}`, embeds: [embedNivel] }).catch(() => {});
    }

    // --- PROCESAR COMANDOS CON PREFIJO ! ---
    const PREFIX = "!";
    if (!message.content.startsWith(PREFIX)) return;

    const args = message.content.slice(PREFIX.length).trim().split(/ +/);
    const command = args.shift().toLowerCase();

    // --- COMANDO: !help ---
    if (command === 'help') {
        const embedHelp = new EmbedBuilder()
            .setTitle('🤖 Menú de Ayuda - Kyle Bot')
            .setDescription(`Prefijo del bot: **\`${PREFIX}\`**`)
            .setColor('#5865f2')
            .addFields(
                { 
                    name: '📊 Niveles', 
                    value: `\`!rank\` - Muestra tu nivel y XP actual.\n\`!nivelchannel #canal\` - Define el canal donde se anunciarán las subidas de nivel.` 
                },
                { 
                    name: '⚙️ Configuración (Admin)', 
                    value: `\`!bienvenida #canal\` - Define canal de bienvenidas.\n\`!despedida #canal\` - Define canal de despedidas.\n\`!logs #canal\` - Define canal de registros.` 
                },
                { 
                    name: '🛡️ Moderación', 
                    value: `\`!ban <@usuario> [razón]\` - Banea a un usuario.\n\`!unban <ID_Usuario>\` - Desbanea a un usuario.\n\`!mute <@usuario> <tiempo> [razón]\` - Silencia (Ej: 1d 1h 3m).\n\`!unmute <@usuario>\` - Remueve el silencio a un usuario.\n\`!kick <@usuario> [razón]\` - Expulsa a un usuario.\n\`!clear <1-100>\` - Borra mensajes masivamente.` 
                },
                {
                    name: '📩 Embeds',
                    value: `\`!embed Título | Descripción | #Color\` - Crea un anuncio en formato Embed.`
                }
            )
            .setFooter({ text: 'Kyle Bot - Tu asistente de Discord', iconURL: client.user.displayAvatarUrl() })
            .setTimestamp();

        return message.channel.send({ embeds: [embedHelp] });
    }

    // --- COMANDO: !rank ---
    if (command === 'rank' || command === 'nivel') {
        const datos = usuariosXP[userId] || { xp: 0, nivel: 1 };
        const xpNecesariaActual = datos.nivel * 100;

        const embedRank = new EmbedBuilder()
            .setTitle(`📊 Perfil de Nivel - ${message.author.username}`)
            .setColor('#2ecc71')
            .addFields(
                { name: 'Nivel Actual', value: `**${datos.nivel}**`, inline: true },
                { name: 'Experiencia (XP)', value: `**${datos.xp} / ${xpNecesariaActual}**`, inline: true }
            )
            .setThumbnail(message.author.displayAvatarUrl({ dynamic: true }))
            .setTimestamp();

        return message.channel.send({ embeds: [embedRank] });
    }

    // --- CONFIGURACIÓN CANAL DE NIVELES: !nivelchannel #canal ---
    if (command === 'nivelchannel' || command === 'canalnivel') {
        if (!message.member.permissions.has(PermissionFlagsBits.Administrator)) {
            return message.reply('❌ Necesitas permisos de Administrador.');
        }
        const canal = message.mentions.channels.first();
        if (!canal) return message.reply('⚠️ Menciona el canal deseado. Ejemplo: `!nivelchannel #niveles`');

        configCanales.niveles = canal.id;
        return message.reply(`✅ Las subidas de nivel ahora se anunciarán en ${canal}`);
    }

    // --- COMANDOS DE CONFIGURACIÓN DE CANALES ---
    if (command === 'bienvenida') {
        if (!message.member.permissions.has(PermissionFlagsBits.Administrator)) return;
        const canal = message.mentions.channels.first();
        if (!canal) return message.reply('⚠️ Menciona el canal: `!bienvenida #canal`');
        configCanales.bienvenida = canal.id;
        return message.reply(`✅ Canal de bienvenidas configurado en ${canal}`);
    }

    if (command === 'despedida') {
        if (!message.member.permissions.has(PermissionFlagsBits.Administrator)) return;
        const canal = message.mentions.channels.first();
        if (!canal) return message.reply('⚠️ Menciona el canal: `!despedida #canal`');
        configCanales.despedida = canal.id;
        return message.reply(`✅ Canal de despedidas configurado en ${canal}`);
    }

    if (command === 'logs') {
        if (!message.member.permissions.has(PermissionFlagsBits.Administrator)) return;
        const canal = message.mentions.channels.first();
        if (!canal) return message.reply('⚠️ Menciona el canal: `!logs #canal`');
        configCanales.logs = canal.id;
        return message.reply(`✅ Canal de logs configurado en ${canal}`);
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

        if (!/^#([0-9A-F]{3}){1,2}$/i.test(color)) color = '#5865f2';

        const customEmbed = new EmbedBuilder()
            .setTitle(titulo)
            .setDescription(descripcion)
            .setColor(color)
            .setFooter({ text: `Enviado por: ${message.author.tag}`, iconURL: message.author.displayAvatarUrl() })
            .setTimestamp();

        return message.channel.send({ embeds: [customEmbed] });
    }

    // ==========================================
    // 3. COMANDOS DE MODERACIÓN
    // ==========================================

    // --- COMANDO: !ban ---
    if (command === 'ban') {
        if (!message.member.permissions.has(PermissionFlagsBits.BanMembers)) {
            return message.reply('❌ No tienes permiso para banear miembros.');
        }
        const userToBan = message.mentions.members.first();
        if (!userToBan || !userToBan.bannable) return message.reply('❌ No se puede banear a este usuario.');
        const razon = args.slice(1).join(' ') || 'Sin razón especificada';

        await userToBan.ban({ reason: razon });
        message.channel.send(`🚫 **${userToBan.user.tag}** ha sido baneado.`);

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

    // --- COMANDO: !unban ---
    if (command === 'unban') {
        if (!message.member.permissions.has(PermissionFlagsBits.BanMembers)) {
            return message.reply('❌ No tienes permiso para desbanear miembros.');
        }
        const userIdToUnban = args[0];
        if (!userIdToUnban) return message.reply('⚠️ Especifica la ID del usuario a desbanear. Ejemplo: `!unban 1234567890`');

        try {
            await message.guild.members.unban(userIdToUnban);
            message.channel.send(`✅ El usuario con ID **${userIdToUnban}** ha sido desbaneado.`);

            const log = new EmbedBuilder()
                .setTitle('🔓 Miembro Desbaneado')
                .setColor('#57f287')
                .addFields(
                    { name: 'ID Usuario', value: `${userIdToUnban}`, inline: true },
                    { name: 'Moderador', value: `${message.author.tag}`, inline: true }
                )
                .setTimestamp();
            enviarLog(message.guild, log);
        } catch (error) {
            return message.reply('❌ No se encontró ningún baneo activo para esa ID.');
        }
    }

    // --- COMANDO: !mute ---
    if (command === 'mute') {
        if (!message.member.permissions.has(PermissionFlagsBits.ModerateMembers)) {
            return message.reply('❌ No tienes permiso para silenciar miembros.');
        }
        const userToMute = message.mentions.members.first();
        if (!userToMute || !userToMute.moderatable) return message.reply('❌ No se puede silenciar a este usuario.');

        const argsSinUser = args.slice(1).join(' ');
        const tiempoMs = parsearTiempo(argsSinUser);
        if (!tiempoMs) return message.reply('⚠️ Especifica un tiempo válido (Ej: `1d`, `2h`, `10m`, `1d1h3m`).');

        const razon = argsSinUser.replace(/(\d+)\s*([dhm])/gi, '').trim() || 'Sin razón especificada';

        await userToMute.timeout(tiempoMs, razon);
        message.channel.send(`🔇 **${userToMute.user.tag}** ha sido silenciado.`);

        const log = new EmbedBuilder()
            .setTitle('🔇 Miembro Silenciado')
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

    // --- COMANDO: !unmute ---
    if (command === 'unmute') {
        if (!message.member.permissions.has(PermissionFlagsBits.ModerateMembers)) {
            return message.reply('❌ No tienes permiso para desilenciar miembros.');
        }
        const userToUnmute = message.mentions.members.first();
        if (!userToUnmute) return message.reply('⚠️ Menciona al usuario que deseas desilenciar.');

        await userToUnmute.timeout(null); // Quita el aislamiento
        message.channel.send(`🔊 A **${userToUnmute.user.tag}** se le ha retirado el silencio.`);

        const log = new EmbedBuilder()
            .setTitle('🔊 Silencio Retirado')
            .setColor('#57f287')
            .addFields(
                { name: 'Usuario', value: `${userToUnmute.user.tag}`, inline: true },
                { name: 'Moderador', value: `${message.author.tag}`, inline: true }
            )
            .setTimestamp();
        enviarLog(message.guild, log);
    }

    // --- COMANDO: !kick ---
    if (command === 'kick') {
        if (!message.member.permissions.has(PermissionFlagsBits.KickMembers)) return;
        const userToKick = message.mentions.members.first();
        if (!userToKick || !userToKick.kickable) return message.reply('❌ No se puede expulsar a este usuario.');
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

    // --- COMANDO: !clear ---
    if (command === 'clear') {
        if (!message.member.permissions.has(PermissionFlagsBits.ManageMessages)) return;
        const cantidad = parseInt(args[0]);
        if (isNaN(cantidad) || cantidad < 1 || cantidad > 100) return message.reply('⚠️ Cantidad entre 1 y 100.');

        await message.channel.bulkDelete(cantidad, true);
        const reply = await message.channel.send(`🧹 Eliminados ${cantidad} mensajes.`);
        setTimeout(() => reply.delete().catch(() => {}), 3000);
    }
});

client.login(process.env.TOKEN);
            
