/* eslint-disable no-unused-vars */
const { SlashCommandBuilder, PermissionFlagsBits, ChatInputCommandInteraction } = require('discord.js');
const GiveawayManager = require('../../src/utils/GiveawayManager');
const GiveawaySchema = require('../../Database/GiveawaySchema');

module.exports = {
	data: new SlashCommandBuilder()
		.setName('giveaway')
		.setDescription('Manage giveaways')
		.setDefaultMemberPermissions(PermissionFlagsBits.ManageGuild)
		.addSubcommand(subcommand =>
			subcommand
				.setName('start')
				.setDescription('Start a new giveaway')
				.addStringOption(option =>
					option.setName('prize')
						.setDescription('What is the prize?')
						.setRequired(true))
				.addIntegerOption(option =>
					option.setName('winners')
						.setDescription('How many winners?')
						.setRequired(true)
						.setMinValue(1))
				.addStringOption(option =>
					option.setName('duration')
						.setDescription('How long should the giveaway last? (1m, 1h, 1d)')
						.setRequired(true)))
		.addSubcommand(subcommand =>
			subcommand
				.setName('end')
				.setDescription('End a giveaway early')
				.addStringOption(option =>
					option.setName('message_id')
						.setDescription('The message ID of the giveaway')
						.setRequired(true))),
	disabled: false,
	permissions: [],

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
					content: '❌ Could not find an active giveaway with that message ID!',
				});
			}

			const endedGiveaway = await GiveawayManager.end(messageId);

			if (endedGiveaway) {
				return await interaction.editReply({
					content: '✅ Giveaway ended successfully!',
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