/* eslint-disable no-unused-vars */
const {
	EmbedBuilder,
	SlashCommandBuilder,
	PermissionFlagsBits,
	ChatInputCommandInteraction,
} = require('discord.js');
const loadCommands = require('../../src/utils/CommandLoader');
const loadEvents = require('../../src/utils/EventLoader');

module.exports = {
	data: new SlashCommandBuilder()
		.setName('reload')
		.setDescription('Reloads all commands or events')
		.addSubcommand(subcommand =>
			subcommand
				.setName('commands')
				.setDescription('Reloads all commands'),
		)
		.addSubcommand(subcommand =>
			subcommand
				.setName('events')
				.setDescription('Reloads all events'),
		),
	disabled: false,
	permissions: [ PermissionFlagsBits.Administrator ],

	/**
     * Executes the help command
     * @param {ChatInputCommandInteraction} interaction - Command Interaction
     */
	async execute(interaction, client) {
		await interaction.deferReply();

		const subcommand = interaction.options.getSubcommand();
		const embed = new EmbedBuilder().setColor('Green').setTimestamp();

		try {
			if (subcommand === 'commands') {
				await loadCommands(client);
				embed.setDescription('✅ Reloaded all commands.');
			}
			else {
				for (const [key, value] of client.events) {
					client.removeListener(key, value);
				}

				await loadEvents(client);
				embed.setDescription('✅ Reloaded all events.');
			}

			return await interaction.editReply({ embeds: [embed] });
		}
		catch (error) {
			console.error('Error in reload command:', error);
			return await interaction.editReply({
				content: '❌ An error occured while reloading. The developers have been notified.',
				flags: ['Ephemeral'],
			});
		}
	},
};