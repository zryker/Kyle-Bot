const { 
    Client, 
    GatewayIntentBits, 
    EmbedBuilder, 
    PermissionFlagsBits, 
    REST, 
    Routes, 
    SlashCommandBuilder 
} = require('discord.js');
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

// ==========================================
// REGISTRO DE COMANDOS SLASH (/) EN DISCORD
// ==========================================
const commands = [
    new SlashCommandBuilder()
        .setName('embed')
        .setDescription('Crea un mensaje en formato Embed')
        .addStringOption(option => 
            option.setName('titulo')
                .setDescription('Título del mensaje')
                .setRequired(true))
        .addStringOption(option => 
            option.setName('descripcion')
                .setDescription('Descripción del mensaje')
                .setRequired(true))
        .addStringOption(option => 
            option.setName('color')
                .setDescription('Color en formato Hex (Ej: #ff0000 o #5865f2)')
                .setRequired(false)),

    new SlashCommandBuilder()
        .setName('clear')
        .setDescription('Elimina mensajes masivamente')
        .setDefaultMemberPermissions(PermissionFlagsBits.ManageMessages)
        .addIntegerOption(option => 
            option.setName('cantidad')
                .setDescription('Número de mensajes a borrar (1 - 100)')
                .setRequired(true)),

    new SlashCommandBuilder()
        .setName('kick')
        .setDescription('Expulsa a un miembro del servidor')
        .setDefaultMemberPermissions(PermissionFlagsBits.KickMembers)
        .addUserOption(option => 
            option.setName('usuario')
                .setDescription('Usuario a expulsar')
                .setRequired(true))
        .addStringOption(option => 
            option.setName('razon')
                .setDescription('Razón de la expulsión')
                .setRequired(false)),

    new SlashCommandBuilder()
        .setName('ban')
        .setDescription('Banea a un miembro del servidor')
        .setDefaultMemberPermissions(PermissionFlagsBits.BanMembers)
        .addUserOption(option => 
            option.setName('usuario')
                .setDescription('Usuario a banear')
                .setRequired(true))
        .addStringOption(option => 
            option.setName('razon')
                .setDescription('Razón del baneo')
                .setRequired(false))
];

// Evento: Bot listo y registro de comandos Slash
client.once('ready', async () => {
    console.log(`¡Kyle Bot se ha conectado como ${client.user.tag}!`);
    client.user.setActivity('Servidor | /embed', { type: 0 });

    const rest = new REST({ version: '10' }).setToken(process.env.TOKEN);
    try {
        console.log('Cargando comandos Slash (/)...');
        await rest.put(
            Routes.applicationCommands(client.user.id),
            { body: commands }
        );
        console.log('¡Comandos Slash (/) registrados exitosamente!');
    } catch (error) {
        console.error('Error registrando los comandos Slash:', error);
    }
});

// ==========================================
// SISTEMA DE BIENVENIDAS Y DESPEDIDAS
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
// ATENCIÓN A COMANDOS SLASH (INTERACCIONES)
// ==========================================
client.on('interactionCreate', async (interaction) => {
    if (!interaction.isChatInputCommand()) return;

    const { commandName } = interaction;

    // --- COMANDO: /embed ---
    if (commandName === 'embed') {
        const titulo = interaction.options.getString('titulo');
        const descripcion = interaction.options.getString('descripcion');
        let color = interaction.options.getString('color') || '#5865f2';

        if (!/^#([0-9A-F]{3}){1,2}$/i.test(color)) {
            color = '#5865f2';
        }

        const customEmbed = new EmbedBuilder()
            .setTitle(titulo)
            .setDescription(descripcion)
            .setColor(color)
            .setFooter({ text: `Enviado por: ${interaction.user.tag}`, iconURL: interaction.user.displayAvatarUrl() })
            .setTimestamp();

        // Responder directamente con el Embed en el canal
        await interaction.reply({ embeds: [customEmbed] });
    }

    // --- COMANDO: /clear ---
    if (commandName === 'clear') {
        const cantidad = interaction.options.getInteger('cantidad');

        if (cantidad < 1 || cantidad > 100) {
            return interaction.reply({ content: '⚠️ Debes indicar una cantidad entre 1 y 100.', ephemeral: true });
        }

        await interaction.channel.bulkDelete(cantidad, true);
        await interaction.reply({ content: `🧹 Se han eliminado ${cantidad} mensajes.`, ephemeral: true });

        const log = new EmbedBuilder()
            .setTitle('🧹 Mensajes Eliminados')
            .setColor('#fee75c')
            .addFields(
                { name: 'Canal', value: `${interaction.channel}`, inline: true },
                { name: 'Cantidad', value: `${cantidad}`, inline: true },
                { name: 'Moderador', value: `${interaction.user.tag}`, inline: true }
            )
            .setTimestamp();
        enviarLog(interaction.guild, log);
    }

    // --- COMANDO: /kick ---
    if (commandName === 'kick') {
        const userToKick = interaction.options.getMember('usuario');
        const razon = interaction.options.getString('razon') || 'Sin razón especificada';

        if (!userToKick) {
            return interaction.reply({ content: '❌ Usuario no encontrado en este servidor.', ephemeral: true });
        }
        if (!userToKick.kickable) {
            return interaction.reply({ content: '❌ No puedo expulsar a este usuario (rol más alto o permisos insuficientes).', ephemeral: true });
        }

        await userToKick.kick(razon);
        await interaction.reply({ content: `✅ **${userToKick.user.tag}** ha sido expulsado.` });

        const log = new EmbedBuilder()
            .setTitle('👞 Miembro Expulsado')
            .setColor('#ed4245')
            .addFields(
                { name: 'Usuario', value: `${userToKick.user.tag}`, inline: true },
                { name: 'Moderador', value: `${interaction.user.tag}`, inline: true },
                { name: 'Razón', value: razon }
            )
            .setTimestamp();
        enviarLog(interaction.guild, log);
    }

    // --- COMANDO: /ban ---
    if (commandName === 'ban') {
        const userToBan = interaction.options.getMember('usuario');
        const razon = interaction.options.getString('razon') || 'Sin razón especificada';

        if (!userToBan) {
            return interaction.reply({ content: '❌ Usuario no encontrado en este servidor.', ephemeral: true });
        }
        if (!userToBan.bannable) {
            return interaction.reply({ content: '❌ No puedo banear a este usuario (rol más alto o permisos insuficientes).', ephemeral: true });
        }

        await userToBan.ban({ reason: razon });
        await interaction.reply({ content: `🚫 **${userToBan.user.tag}** ha sido baneado.` });

        const log = new EmbedBuilder()
            .setTitle('🚫 Miembro Baneado')
            .setColor('#ed4245')
            .addFields(
                { name: 'Usuario', value: `${userToBan.user.tag}`, inline: true },
                { name: 'Moderador', value: `${interaction.user.tag}`, inline: true },
                { name: 'Razón', value: razon }
            )
            .setTimestamp();
        enviarLog(interaction.guild, log);
    }
});

// Comandos de prefijo (!) para configuración de canales
client.on('messageCreate', async (message) => {
    if (message.author.bot || !message.content.startsWith('!')) return;

    const args = message.content.slice(1).trim().split(/ +/);
    const command = args.shift().toLowerCase();

    if (command === 'bienvenida') {
        if (!message.member.permissions.has(PermissionFlagsBits.Administrator)) return;
        const canal = message.mentions.channels.first();
        if (!canal) return message.reply('⚠️ Menciona el canal: `!bienvenida #canal`');
        configCanales.bienvenida = canal.id;
        return message.reply(`✅ Bienvenidas configuradas en ${canal}`);
    }

    if (command === 'despedida') {
        if (!message.member.permissions.has(PermissionFlagsBits.Administrator)) return;
        const canal = message.mentions.channels.first();
        if (!canal) return message.reply('⚠️ Menciona el canal: `!despedida #canal`');
        configCanales.despedida = canal.id;
        return message.reply(`✅ Despedidas configuradas en ${canal}`);
    }

    if (command === 'logs') {
        if (!message.member.permissions.has(PermissionFlagsBits.Administrator)) return;
        const canal = message.mentions.channels.first();
        if (!canal) return message.reply('⚠️ Menciona el canal: `!logs #canal`');
        configCanales.logs = canal.id;
        return message.reply(`✅ Logs configurados en ${canal}`);
    }
});

client.login(process.env.TOKEN);
                
