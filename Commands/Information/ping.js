/* eslint-disable no-unused-vars */
const { EmbedBuilder, ChatInputCommandInteraction } = require('discord.js');

module.exports = {
	name: 'ping',
	description: 'Get the latency of the bot',
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
			.setTitle('ℹ️ Latency Information')
			.setDescription(`Latency: ${Date.now() - start}ms\nAPI Latency: ${Math.round(client.ws.ping)}ms`)
			.setColor('Green')
			.setTimestamp();

		return await interaction.editReply({ embeds: [embed] });
	},
};