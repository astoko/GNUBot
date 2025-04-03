/* eslint-disable no-unused-vars */
const { ChatInputCommandInteraction, EmbedBuilder, AttachmentBuilder, SlashCommandBuilder } = require('discord.js');
const XpSchema = require('../../database/Xp');
const { Profile } = require('discord-arts');

module.exports = {
	data: new SlashCommandBuilder()
		.setName('rank')
		.setDescription('View someones xp and level information')
		.addUserOption(option =>
			option.setName('discord_user')
				.setDescription('The discord user to get information on')
				.setRequired(false),
		),
	disabled: false,
	permissions: [],

	/**
     * Executes the rank command
     * @param {ChatInputCommandInteraction} interaction - Command Interaction
     */
	async execute(interaction, client) {
		await interaction.deferReply();

		const member = interaction.options.getMember('discord_user') || interaction.member;
		const user = await XpSchema.findOne({ guildId: interaction.guild.id, discordId: member.id });
		const users = await XpSchema.find({ guildId: interaction.guild.id }).sort({ level: -1 });

		if (!user) {
			return await interaction.editReply({ embeds: [
				new EmbedBuilder()
					.setColor('Red')
					.setDescription(`❌ <:${member} does not have any xp or level.`),
			], flags: ['Ephemeral'] });
		}

		const userRank = users.findIndex(usr => usr.discordId === member.id) + 1;
		const presenceStatus = member.presence?.status || 'offline';
		const buffer = await Profile(member.id, {
			presenceStatus: presenceStatus,
			badgesFrame: false,
			removeBadges: true,
			customBackground: './assets/images/lvlup.png',
			customFont: './assets/fonts/ReadexPro/ReadexPro-Regular.ttf',
			removeBorder: true,
			rankData: {
				currentXp: user.xp,
				requiredXp: user.level * 250,
				rank: userRank,
				level: user.level,
				barColor: '#ECDFC7',
				levelColor: '#ada8c6',
				autoColorRank: true,
			},
		});
		const attachment = new AttachmentBuilder(buffer, { name: 'profile.png' });

		await interaction.editReply({ files: [attachment] });
	},
};