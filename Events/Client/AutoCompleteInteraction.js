/* eslint-disable no-unused-vars */
const {
	Events,
	AutocompleteInteraction,
	Client,
} = require('discord.js');

module.exports = {
	name: Events.InteractionCreate,

	/**
     * Executes autocomplete interaction
     * @param {AutocompleteInteraction} interaction - Autocomplete interaction object
     * @param {Client} client - Discord client instance
     * @returns {Promise<void>}
     */
	async execute(interaction, client) {
		if (!interaction.isAutocomplete()) return;

		const sendError = async (description) => {
			return interaction.isRepliable()
				? await interaction.reply({ content: description, flags: ['Ephemeral'] })
				: await interaction.followUp({ content: description, flags: ['Ephemeral'] });
		};

		const command = await client.commands.get(interaction.commandName);

		if (!command) {
			await client.commands.delete(interaction.commandName);
			return await sendError(`Command \`${interaction.commandName}\` is invalid.`);
		}

		try {
			await command.autocomplete(interaction);
		}
		catch (error) {
			console.error(`Error in autocomplete for command ${interaction.commandName}:`, error);
			return [];
		}
	},
};