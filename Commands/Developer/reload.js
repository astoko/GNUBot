/* eslint-disable no-unused-vars */
const {
	EmbedBuilder,
	PermissionFlagsBits,
	ChatInputCommandInteraction,
	ApplicationCommandOptionType,
} = require('discord.js');

module.exports = {
	name: 'reload',
	description: 'Reloads commands or events for this guild',
	options: [
		{
			name: 'type',
			description: 'What to reload',
			type: ApplicationCommandOptionType.String,
			required: true,
			choices: [
				{ name: 'Commands', value: 'commands' },
				{ name: 'Events', value: 'events' },
			],
		},
	],
	disabled: true,
	permissions: [ PermissionFlagsBits.Administrator ],

	/**
     * Executes the reload command
     * @param {ChatInputCommandInteraction} interaction - Command Interaction
     */
	async execute(interaction, client) {
	},
};