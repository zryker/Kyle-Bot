const { Client, GatewayIntentBits, PermissionFlagsBits } = require('discord.js');
const express = require('express');
const fs = require('fs');
const path = require('path');

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

// Guardado persistente en archivo config.json
const configPath = path.join(__dirname, 'config.json');
let configCanales = { bienvenida: null, despedida: null, niveles: null, logs: null };

if (fs.existsSync(configPath)) {
    try {
        configCanales = JSON.parse(fs.readFileSync(configPath, 'utf8'));
    } catch (e) {
        console.error("Error leyendo config.json:", e);
    }
}

function guardarConfig() {
    try {
        fs.writeFileSync(configPath, JSON.stringify(configCanales, null, 2));
    } catch (e) {
        console.error("Error guardando config.json:", e);
    }
}

const usuariosXP = {};

// Helper para obtener un canal por Mención, ID o Nombre
function obtenerCanal(message, args) {
    // 1. Si el usuario mencionó el canal directamente
    if (message.mentions.channels.first()) {
        return message.mentions.channels.first();
    }
    
    if (!args[0]) return null;
    
    // Limpia caracteres de mención si los hay (<#ID>)
    const canalId = args[0].replace(/[<#>]/g, '');
    
    // 2. Buscar por ID o por Nombre del canal en el servidor
    return message.guild.channels.cache.get(canalId) || 
           message.guild.channels.cache.find(c => c.name.toLowerCase() === args.join(' ').toLowerCase().replace('#', ''));
}

// Helper para enviar registros al canal de Logs
async function enviarLog(guild, texto) {
    if (!configCanales.logs) return;
    const logChannel = guild.channels.cache.get(configCanales.logs);
    if (logChannel) {
        await logChannel.send(texto).catch(() => {});
    }
}

// Helper para parsear tiempo (1d, 1h, 3m)
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
// 1. BIENVENIDAS Y DESPEDIDAS (Texto Plano)
// ==========================================

client.on('guildMemberAdd', async (member) => {
    if (configCanales.bienvenida) {
        const channel = member.guild.channels.cache.get(configCanales.bienvenida);
        if (channel) {
            await channel.send(`🎉 ¡Bienvenido/a a **${member.guild.name}**, ${member}! Pásala excelente en el servidor. *(Miembro #${member.guild.memberCount})*`).catch(() => {});
        }
    }
    enviarLog(member.guild, `📥 **Nuevo Miembro:** ${member.user.tag} (${member.id}) se ha unido al servidor.`);
});

client.on('guildMemberRemove', async (member) => {
    if (configCanales.despedida) {
        const channel = member.guild.channels.cache.get(configCanales.despedida);
        if (channel) {
            await channel.send(`😢 **${member.user.tag}** ha salido del servidor. ¡Esperamos volver a verte!`).catch(() => {});
        }
    }
    enviarLog(member.guild, `📤 **Miembro Saliente:** ${member.user.tag} (${member.id}) ha salido del servidor.`);
});

// ==========================================
// 2. SISTEMA DE NIVELES Y COMANDOS (!)
// ==========================================

client.on('messageCreate', async (message) => {
    if (message.author.bot || !message.guild) return;

    // --- SISTEMA DE XP POR MENSAJE ---
    const userId = message.author.id;
    if (!usuariosXP[userId]) {
        usuariosXP[userId] = { xp: 0, nivel: 1 };
    }

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

        await canalEnvio.send(`🎉 ¡Felicidades ${message.author}! Has subido al **Nivel ${usuariosXP[userId].nivel}** 🚀`).catch(() => {});
    }

    // --- PROCESAR COMANDOS CON ! ---
    const PREFIX = "!";
    if (!message.content.startsWith(PREFIX)) return;

    const args = message.content.slice(PREFIX.length).trim().split(/ +/);
    const command = args.shift().toLowerCase();

    try {
        // --- COMANDO: !help ---
        if (command === 'help') {
            const ayudaTexto = 
`🤖 **MENÚ DE AYUDA - KYLE BOT**
Prefijo del bot: \`!\`

📊 **NIVELES**
• \`!rank\` - Consulta tu nivel y XP acumulada.
• \`!nivelchannel #canal\` - Establece el canal donde se anuncian los niveles.

⚙️ **CONFIGURACIÓN (Administradores)**
• \`!bienvenida #canal\` - Define el canal de bienvenidas.
• \`!despedida #canal\` - Define el canal de despedidas.
• \`!logs #canal\` - Define el canal de registros de moderación.

🛡️ **MODERACIÓN**
• \`!mute <@usuario> <tiempo> [razón]\` - Silencia (Ej: \`!mute @user 1d 1h 3m SPAM\`).
• \`!unmute <@usuario>\` - Retira el silencio a un usuario.
• \`!ban <@usuario> [razón]\` - Banea a un usuario.
• \`!unban <ID_Usuario>\` - Desbanea a un usuario usando su ID.
• \`!kick <@usuario> [razón]\` - Expulsa a un usuario.
• \`!clear <1-100>\` - Borra mensajes masivamente.

📩 **ANUNCIOS**
• \`!embed Título | Descripción\` - Envía un anuncio formateado.`;

            return await message.channel.send(ayudaTexto);
        }

        // --- COMANDO: !rank ---
        if (command === 'rank' || command === 'nivel') {
            const datos = usuariosXP[userId] || { xp: 0, nivel: 1 };
            const xpRequerida = datos.nivel * 100;
            return await message.channel.send(`📊 **Perfil de Nivel de ${message.author.username}:**\n• Nivel: **${datos.nivel}**\n• Experiencia: **${datos.xp} / ${xpRequerida} XP**`);
        }

        // --- COMANDO: !embed ---
        if (command === 'embed') {
            const contenido = args.join(' ');
            const partes = contenido.split('|');

            if (!partes[0] || !partes[1]) {
                return message.reply('❌ Uso correcto: `!embed Título | Descripción`');
            }

            const titulo = partes[0].trim();
            const descripcion = partes[1].trim();

            const anuncioTexto = `📢 **${titulo}**\n\n${descripcion}\n\n_*Enviado por ${message.author.tag}*_`;
            return await message.channel.send(anuncioTexto);
        }

        // --- COMANDOS DE CONFIGURACIÓN ---
        if (command === 'bienvenida') {
            if (!message.member.permissions.has(PermissionFlagsBits.Administrator)) return message.reply('❌ Necesitas permisos de Administrador.');
            const canal = obtenerCanal(message, args);
            if (!canal) return message.reply('⚠️ Menciona el canal deseado. Ejemplo: `!bienvenida #canal`');
            
            configCanales.bienvenida = canal.id;
            guardarConfig();
            return message.reply(`✅ Canal de bienvenidas configurado correctamente en ${canal}`);
        }

        if (command === 'despedida') {
            if (!message.member.permissions.has(PermissionFlagsBits.Administrator)) return message.reply('❌ Necesitas permisos de Administrador.');
            const canal = obtenerCanal(message, args);
            if (!canal) return message.reply('⚠️ Menciona el canal deseado. Ejemplo: `!despedida #canal`');
            
            configCanales.despedida = canal.id;
            guardarConfig();
            return message.reply(`✅ Canal de despedidas configurado correctamente en ${canal}`);
        }

        if (command === 'nivelchannel') {
            if (!message.member.permissions.has(PermissionFlagsBits.Administrator)) return message.reply('❌ Necesitas permisos de Administrador.');
            const canal = obtenerCanal(message, args);
            if (!canal) return message.reply('⚠️ Menciona el canal deseado. Ejemplo: `!nivelchannel #canal`');
            
            configCanales.niveles = canal.id;
            guardarConfig();
            return message.reply(`✅ Las subidas de nivel ahora se anunciarán en ${canal}`);
        }

        if (command === 'logs') {
            if (!message.member.permissions.has(PermissionFlagsBits.Administrator)) return message.reply('❌ Necesitas permisos de Administrador.');
            const canal = obtenerCanal(message, args);
            if (!canal) return message.reply('⚠️ Menciona el canal deseado. Ejemplo: `!logs #canal`');
            
            configCanales.logs = canal.id;
            guardarConfig();
            return message.reply(`✅ Canal de logs configurado correctamente en ${canal}`);
        }

        // --- COMANDOS DE MODERACIÓN ---
        if (command === 'clear') {
            if (!message.member.permissions.has(PermissionFlagsBits.ManageMessages)) return message.reply('❌ Permisos insuficientes.');
            const cantidad = parseInt(args[0]);
            if (isNaN(cantidad) || cantidad < 1 || cantidad > 100) return message.reply('⚠️ Indica una cantidad entre 1 y 100.');

            await message.channel.bulkDelete(cantidad, true);
            const msg = await message.channel.send(`🧹 Se han eliminado **${cantidad}** mensajes.`);
            setTimeout(() => msg.delete().catch(() => {}), 3000);
            return;
        }

        if (command === 'mute') {
            if (!message.member.permissions.has(PermissionFlagsBits.ModerateMembers)) return message.reply('❌ Permisos insuficientes.');
            const userToMute = message.mentions.members.first();
            if (!userToMute) return message.reply('⚠️ Uso: `!mute <@usuario> <tiempo> [razón]`');
            if (!userToMute.moderatable) return message.reply('❌ No puedo silenciar a este usuario.');

            const argsSinUser = args.slice(1).join(' ');
            const tiempoMs = parsearTiempo(argsSinUser);
            if (!tiempoMs) return message.reply('⚠️ Tiempo inválido. Usa d, h o m (Ej: `1d`, `2h`, `1d1h3m`).');

            const razon = argsSinUser.replace(/(\d+)\s*([dhm])/gi, '').trim() || 'Sin razón especificada';
            await userToMute.timeout(tiempoMs, razon);
            
            message.channel.send(`🔇 **${userToMute.user.tag}** ha sido silenciado correctamente.`);
            enviarLog(message.guild, `🔇 **Mute:** ${userToMute.user.tag} por ${argsSinUser.match(/(\d+)\s*([dhm])/gi).join(' ')}. Mod: ${message.author.tag}. Razón: ${razon}`);
            return;
        }

        if (command === 'unmute') {
            if (!message.member.permissions.has(PermissionFlagsBits.ModerateMembers)) return message.reply('❌ Permisos insuficientes.');
            const userToUnmute = message.mentions.members.first();
            if (!userToUnmute) return message.reply('⚠️ Menciona al usuario a desilenciar.');

            await userToUnmute.timeout(null);
            message.channel.send(`🔊 A **${userToUnmute.user.tag}** se le ha retirado el silencio.`);
            enviarLog(message.guild, `🔊 **Unmute:** ${userToUnmute.user.tag}. Mod: ${message.author.tag}`);
            return;
        }

        if (command === 'ban') {
            if (!message.member.permissions.has(PermissionFlagsBits.BanMembers)) return message.reply('❌ Permisos insuficientes.');
            const userToBan = message.mentions.members.first();
            if (!userToBan || !userToBan.bannable) return message.reply('❌ No se puede banear a este usuario.');
            const razon = args.slice(1).join(' ') || 'Sin razón especificada';

            await userToBan.ban({ reason: razon });
            message.channel.send(`🚫 **${userToBan.user.tag}** ha sido baneado del servidor.`);
            enviarLog(message.guild, `🚫 **Ban:** ${userToBan.user.tag}. Mod: ${message.author.tag}. Razón: ${razon}`);
            return;
        }

        if (command === 'unban') {
            if (!message.member.permissions.has(PermissionFlagsBits.BanMembers)) return message.reply('❌ Permisos insuficientes.');
            const userIdToUnban = args[0];
            if (!userIdToUnban) return message.reply('⚠️ Especifica la ID del usuario. Ej: `!unban 1234567890`');

            try {
                await message.guild.members.unban(userIdToUnban);
                message.channel.send(`✅ ID **${userIdToUnban}** desbaneada con éxito.`);
                enviarLog(message.guild, `🔓 **Unban:** ID ${userIdToUnban}. Mod: ${message.author.tag}`);
            } catch (err) {
                message.reply('❌ No se encontró ningún baneo activo para esa ID.');
            }
            return;
        }

        if (command === 'kick') {
            if (!message.member.permissions.has(PermissionFlagsBits.KickMembers)) return message.reply('❌ Permisos insuficientes.');
            const userToKick = message.mentions.members.first();
            if (!userToKick || !userToKick.kickable) return message.reply('❌ No se puede expulsar a este usuario.');
            const razon = args.slice(1).join(' ') || 'Sin razón especificada';

            await userToKick.kick(razon);
            message.channel.send(`i **${userToKick.user.tag}** expulsado del servidor.`);
            enviarLog(message.guild, `👞 **Kick:** ${userToKick.user.tag}. Mod: ${message.author.tag}. Razón: ${razon}`);
            return;
        }

    } catch (error) {
        console.error(`Error en comando ${command}:`, error);
        message.reply(`❌ Ocurrió un error al procesar la orden: \`${error.message}\``);
    }
});

client.login(process.env.TOKEN);
                
