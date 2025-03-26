/* eslint-disable no-unused-vars */
const {
	EmbedBuilder,
	SlashCommandBuilder,
	ChatInputCommandInteraction,
} = require('discord.js');
const loadCommands = require('../../src/utils/CommandLoader');
const loadEvents = require('../../src/utils/EventLoader');

module.exports = {
	data: new SlashCommandBuilder()
		.setName('ping')
		.setDescription('Gets latency and API latency of the bot'),
	disabled: false,
	permissions: [],

	/**
     * Executes the help command
     * @param {ChatInputCommandInteraction} interaction - Command Interaction
     */
	async execute(interaction, client) {
		const start = Date.now();
		await interaction.deferReply();

		const embed = new EmbedBuilder()
			.setDescription(`Latency: ${Date.now() - start}ms\nAPI Latency: ${Math.round(client.ws.ping)}ms`)
			.setColor('Green')
			.setTimestamp();

		return await interaction.editReply({ embeds: [embed] });
	},
};