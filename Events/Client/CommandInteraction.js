/* eslint-disable no-unused-vars */
const {
	Events,
	ChatInputCommandInteraction,
	Client,
	ChannelType,
	PermissionFlagsBits,
	time,
} = require('discord.js');
const GetPermissionNames = require('../../src/utils/GetPermissionNames');
const ConfigSchema = require('../../Database/Config');

module.exports = {
	name: Events.InteractionCreate,

	/**
     * Executes command interaction
     * @param {ChatInputCommandInteraction} interaction - Command interaction object
     * @param {Client} client - Discord client instance
     * @returns {Promise<void>}
     */
	async execute(interaction, client) {
		if (!interaction.isChatInputCommand()) return;

		const sendError = async (description) => {
			return interaction.isRepliable()
				? await interaction.reply({ content: description, flags: ['Ephemeral'] })
				: await interaction.followUp({ content: description, flags: ['Ephemeral'] });
		};

		if (interaction.channel.type === ChannelType.DM) {
			return await sendError('❌ This bot does not support DM commands.');
		}

		const command = await client.commands.get(interaction.commandName);

		if (!command) {
			await client.commands.delete(interaction.commandName);
			return await sendError(`❌ Command \`${interaction.commandName}\` is invalid.`);
		}

		const cooldownKey = `${interaction.user.id}-${command.data.name}`;
		const timestamp = await client.commandCooldown.get(cooldownKey);

		if (timestamp) {
			const expirationTime = timestamp + 3000;
			const timeLeft = expirationTime - Date.now();

			if (timeLeft > 0) {
				const availableTimestamp = Math.floor((Date.now() + timeLeft) / 1000);
				return await sendError(`❌ You are on cooldown. Try again ${time(availableTimestamp, 'R')}`);
			}
		}

		const config = await ConfigSchema.findOne({ guildId: interaction.guild.id });
		const commandConfig = config?.commands?.find(cmd => cmd.name === command.data.name);
		const requiredPerms = commandConfig?.permissions || commandConfig?.defaultPermissions;
		const requiredRoles = commandConfig?.roles || [];

		if (requiredPerms.length) {
			const missingPerms = requiredPerms.filter(perm =>
				!interaction.member.permissions.has(PermissionFlagsBits[perm]),
			);

			if (missingPerms.length) {
				const readablePerms = await GetPermissionNames(missingPerms);
				return await sendError(`❌ You need the following permissions to use this command: \`${readablePerms.join(', ')}\``);
			}
		}

		if (requiredRoles.length) {
			const hasRole = await interaction.member.roles.cache.some(role =>
				requiredRoles.includes(role.id),
			);

			if (!hasRole) {
				return await sendError('❌ You do not have the required roles to use this command.');
			}
		}

		try {
			await client.commandCooldown.set(cooldownKey, Date.now() + 1000);
			await command.execute(interaction, client);
		}
		catch (error) {
			console.error(`Error executing command ${interaction.commandName}:`, error);
			await await sendError('❌ An error occured while executing this command. Developers have been notified.');
		}
	},
};