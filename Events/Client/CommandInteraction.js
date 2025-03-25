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

module.exports = {
	name: Events.InteractionCreate,

	/**
	 * @param {ChatInputCommandInteraction} interaction
	 * @param {Client} client
	 */
	async execute(interaction, client) {
		if (!interaction.isChatInputCommand()) return;

		const sendError = async (description) => {
			return interaction.isRepliable()
				? await interaction.reply({ content: description, flags: ['Ephemeral'] })
				: await interaction.followUp({ content: description, flags: ['Ephemeral'] });
		};

		if (interaction.channel.type === ChannelType.DM) {
			return await sendError('This bot does not support DM commands.');
		}

		const command = await client.commands.get(interaction.commandName);

		if (!command) {
			await client.commands.delete(interaction.commandName);
			return await sendError(`Command \`${interaction.commandName}\` is invalid.`);
		}

		const cooldownKey = `${interaction.user.id}-${command.data.name}`;
		const timestamp = await client.commandCooldown.get(cooldownKey);

		if (timestamp) {
			const expirationTime = timestamp + 3000;
			const timeLeft = expirationTime - Date.now();

			if (timeLeft > 0) {
				const availableTimestamp = Math.floor((Date.now() + timeLeft) / 1000);
				return await sendError(`You are on cooldown. Try again ${time(availableTimestamp, 'R')}`);
			}
		}

		if (command.permissions?.length) {
			const missingPerms = command.permissions.filter(perm =>
				!interaction.member.permissions.has(PermissionFlagsBits[perm]),
			);

			if (missingPerms.length) {
				const readablePerms = await GetPermissionNames(missingPerms || []);
				return await sendError(`You need the following permissions to use this command: \`${readablePerms.join(', ')}\``);
			}
		}

		try {
			await client.commandCooldown.set(cooldownKey, Date.now() + 1000);
			await command.execute(interaction, client);
		}
		catch (error) {
			console.error(`Error executing command ${interaction.commandName}:`, error);
			await await sendError('An error occured while executing this command. Developers have been notified.');
		}
	},
};