/* eslint-disable no-unused-vars */
const { PermissionFlagsBits, ChatInputCommandInteraction, ApplicationCommandOptionType } = require('discord.js');
const GiveawayManager = require('../../src/utils/GiveawayManager');
const GiveawaySchema = require('../../database/GiveawaySchema');

module.exports = {
	name: 'giveaway',
	description: 'Manage giveaways',
	options: [
		{
			name: 'start',
			description: 'Start a new giveaway',
			type: ApplicationCommandOptionType.Subcommand,
			options: [
				{
					name: 'prize',
					description: 'What is the prize?',
					type: ApplicationCommandOptionType.String,
					required: true,
				},
				{
					name: 'winners',
					description: 'How many winners?',
					type: ApplicationCommandOptionType.Integer,
					required: true,
					minValue: 1,
				},
				{
					name: 'duration',
					description: 'How long should the giveaway last? (1m, 1h, 1d)',
					type: ApplicationCommandOptionType.String,
					required: true,
				},
			],
		},
		{
			name: 'end',
			description: 'End a giveaway early',
			type: ApplicationCommandOptionType.Subcommand,
			options: [
				{
					name: 'message_id',
					description: 'The message ID of the giveaway',
					type: ApplicationCommandOptionType.String,
					required: true,
				},
			],
		},
	],
	disabled: false,
	permissions: [ PermissionFlagsBits.ManageGuild ],

	/**
     * Execute giveaway command
     * @param {ChatInputCommandInteraction} interaction - Command Interaction
     */
	async execute(interaction) {
		const subcommand = interaction.options.getSubcommand();

		if (subcommand === 'start') {
			return this.handleStart(interaction);
		}
		else if (subcommand === 'end') {
			return this.handleEnd(interaction);
		}
	},

	/**
     * Handle start subcommand
     * @param {ChatInputCommandInteraction} interaction
     */
	async handleStart(interaction) {
		const prize = interaction.options.getString('prize');
		const winnerCount = interaction.options.getInteger('winners');
		const durationStr = interaction.options.getString('duration');

		const duration = parseDuration(durationStr);
		if (!duration) {
			return interaction.reply({
				content: '❌ Invalid duration format! Use 1m, 1h, 1d etc.',
				flags: ['Ephemeral'],
			});
		}

		const giveaway = await GiveawayManager.create({
			channelId: interaction.channelId,
			guildId: interaction.guildId,
			prize,
			winnerCount,
			duration,
			hosterId: interaction.user.id,
		});

		await interaction.reply({
			embeds: [GiveawayManager.createEmbed(giveaway)],
			components: [GiveawayManager.createButtons()],
		});

		const message = await interaction.fetchReply();

		await GiveawaySchema.findByIdAndUpdate(
			giveaway._id,
			{ $set: { messageId: message.id } },
		);

		await GiveawayManager.scheduleGiveaway(giveaway);
	},

	/**
     * Handle end subcommand
     * @param {ChatInputCommandInteraction} interaction
     */
	async handleEnd(interaction) {
		try {
			await interaction.deferReply({ flags: ['Ephemeral'] });

			const messageId = interaction.options.getString('message_id');

			const giveaway = await GiveawaySchema.findOne({
				messageId,
				guildId: interaction.guildId,
				ended: false,
			});

			if (!giveaway) {
				return await interaction.editReply({
					content: '❌ Could not find an active giveaway with that message ID.',
				});
			}

			const endedGiveaway = await GiveawayManager.end(messageId);

			if (endedGiveaway) {
				return await interaction.editReply({
					content: '✅ Giveaway ended successfully.',
				});
			}

			return await interaction.editReply({
				content: '❌ Failed to end the giveaway. Please try again.',
			});
		}
		catch (error) {
			console.error('Error handling giveaway end:', error);
			if (!interaction.replied && !interaction.deferred) {
				await interaction.reply({
					content: '❌ An error occurred while ending the giveaway.',
					flags: ['Ephemeral'],
				});
			}
			else {
				await interaction.editReply({
					content: '❌ An error occurred while ending the giveaway.',
				});
			}
		}
	},
};

function parseDuration(str) {
	const match = str.match(/^(\d+)([mhd])$/);
	if (!match) return null;

	const [, amount, unit] = match;
	const multipliers = {
		m: 60 * 1000,
		h: 60 * 60 * 1000,
		d: 24 * 60 * 60 * 1000,
	};

	return amount * multipliers[unit];
}