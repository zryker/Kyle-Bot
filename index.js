// ==========================================
// ATENCIÓN A COMANDOS SLASH (INTERACCIONES)
// ==========================================
client.on('interactionCreate', async (interaction) => {
    if (!interaction.isChatInputCommand()) return;

    const { commandName } = interaction;

    // --- COMANDO: /embed ---
    if (commandName === 'embed') {
        // Le avisamos a Discord que estamos procesando (evita el error de 3 segundos)
        await interaction.deferReply().catch(() => {});

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

        // Enviamos la respuesta definitiva
        await interaction.editReply({ embeds: [customEmbed] });
    }

    // --- COMANDO: /clear ---
    if (commandName === 'clear') {
        const cantidad = interaction.options.getInteger('cantidad');

        if (cantidad < 1 || cantidad > 100) {
            return interaction.reply({ content: '⚠️ Debes indicar una cantidad entre 1 y 100.', ephemeral: true });
        }

        await interaction.deferReply({ ephemeral: true }).catch(() => {});

        await interaction.channel.bulkDelete(cantidad, true);
        await interaction.editReply({ content: `🧹 Se han eliminado ${cantidad} mensajes.` });

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
            return interaction.reply({ content: '❌ No puedo expulsar a este usuario.', ephemeral: true });
        }

        await interaction.deferReply().catch(() => {});

        await userToKick.kick(razon);
        await interaction.editReply({ content: `✅ **${userToKick.user.tag}** ha sido expulsado.` });

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
            return interaction.reply({ content: '❌ No puedo banear a este usuario.', ephemeral: true });
        }

        await interaction.deferReply().catch(() => {});

        await userToBan.ban({ reason: razon });
        await interaction.editReply({ content: `🚫 **${userToBan.user.tag}** ha sido baneado.` });

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
