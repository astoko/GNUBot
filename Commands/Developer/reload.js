/* eslint-disable no-unused-vars */
const {
	EmbedBuilder,
	SlashCommandBuilder,
	PermissionFlagsBits,
	ChatInputCommandInteraction,
} = require('discord.js');

module.exports = {
	data: new SlashCommandBuilder()
		.setName('reload')
		.setDescription('Reloads commands or events for this guild')
		.addStringOption(option =>
			option
				.setName('type')
				.setDescription('What to reload')
				.setRequired(true)
				.addChoices(
					{ name: 'Commands', value: 'commands' },
					{ name: 'Events', value: 'events' },
				),
		),
	disabled: true,
	permissions: [PermissionFlagsBits.Administrator],

	/**
     * Executes the reload command
     * @param {ChatInputCommandInteraction} interaction - Command Interaction
     */
	async execute(interaction, client) {
	},
};