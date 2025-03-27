/* eslint-disable no-unused-vars */
const { SlashCommandBuilder, PermissionFlagsBits, ChatInputCommandInteraction } = require('discord.js');
const GiveawayManager = require('../../src/utils/GiveawayManager');

module.exports = {
	data: new SlashCommandBuilder()
		.setName('giveaway')
		.setDescription('Start a giveaway')
		.setDefaultMemberPermissions(PermissionFlagsBits.ManageGuild)
		.addStringOption(option =>
			option.setName('prize')
				.setDescription('What is the prize?')
				.setRequired(true))
		.addIntegerOption(option =>
			option.setName('winners')
				.setDescription('How many winners?')
				.setRequired(true)
				.setMinValue(1)
				.setMaxValue(10))
		.addStringOption(option =>
			option.setName('duration')
				.setDescription('How long should the giveaway last? (1m, 1h, 1d)')
				.setRequired(true)),
	disabled: false,
	permissions: [],

	/**
     * Executives giveaway command
     * @param {ChatInputCommandInteraction} interaction - Command Interaction
     */
	async execute(interaction) {
		const prize = interaction.options.getString('prize');
		const winnerCount = interaction.options.getInteger('winners');
		const durationStr = interaction.options.getString('duration');

		const duration = parseDuration(durationStr);
		if (!duration) {
			return interaction.reply({ content: '❌ Invalid duration format! Use 1m, 1h, 1d etc.', flags: ['Ephemeral'] });
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

		await GiveawayManager.giveaways.updateOne(
			{ _id: giveaway._id },
			{ $set: { messageId: message.id } },
		);

		const updatedGiveaway = await GiveawayManager.giveaways.findOne({ _id: giveaway._id });
		if (updatedGiveaway) {
			await GiveawayManager.scheduleGiveaway(updatedGiveaway);
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