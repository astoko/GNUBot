/* eslint-disable no-unused-vars */
const {
	EmbedBuilder,
	SlashCommandBuilder,
	PermissionFlagsBits,
	ChatInputCommandInteraction,
} = require('discord.js');
const CommandLoader = require('../../src/utils/CommandLoader');
const EventLoader = require('../../src/utils/EventLoader');

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
	disabled: false,
	permissions: [PermissionFlagsBits.Administrator],

	/**
     * Executes the reload command
     * @param {ChatInputCommandInteraction} interaction - Command Interaction
     */
	async execute(interaction, client) {
		let replyPromise;
		try {
			if (!interaction.replied && !interaction.deferred) {
				replyPromise = interaction.deferReply();
			}

			const type = interaction.options.getString('type');
			const guildId = interaction.guildId;
			const embed = new EmbedBuilder()
				.setColor('Blue')
				.setTimestamp();

			if (replyPromise) await replyPromise;

			if (type === 'commands') {
				embed.setDescription('🔄 Commands sent to processing queue.');
				await interaction.editReply({ embeds: [embed] });

				const success = await CommandLoader.loadGuild(client, guildId);
				embed
					.setColor(success ? 'Green' : 'Red')
					.setDescription(success ?
						'✅ Successfully reloaded guild commands.' :
						'❌ Failed to reload guild commands.',
					);
			}
			else if (type === 'events') {
				embed.setDescription('🔄 Events sent to processing queue.');
				await interaction.editReply({ embeds: [embed] });

				const guildEvents = Array.from(client.events.entries())
					.filter(([_, event]) => event.guildId === guildId);

				for (const [key, value] of guildEvents) {
					client.removeListener(key, value);
				}

				const success = await EventLoader.loadGuild(client, guildId);
				embed
					.setColor(success ? 'Green' : 'Red')
					.setDescription(success ?
						'✅ Successfully reloaded guild events.' :
						'❌ Failed to reload guild events.',
					);
			}

			return await interaction.editReply({ embeds: [embed] });
		}
		catch (error) {
			console.error('Error in reload command:', error);
			return await interaction.editReply({
				content: '❌ An error occurred while reloading.',
				flags: ['Ephemeral'],
			});
		}
	},
};