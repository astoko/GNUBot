/* eslint-disable no-unused-vars */
const { ChatInputCommandInteraction, ApplicationCommandOptionType, EmbedBuilder, AttachmentBuilder } = require('discord.js');
const XpSchema = require('../../database/Xp');
const { Profile } = require('discord-arts');
const { description } = require('./xpchange');

module.exports = {
	name: 'rank',
	description: 'View someones xp and level information',
	options: [
		{
			name: 'discord_user',
			description: 'The discord user to get information on',
			type: ApplicationCommandOptionType.User,
			required: true,
		},
	],
	disabled: false,
	permissions: [],

	/**
     * Executes the rank command
     * @param {ChatInputCommandInteraction} interaction - Command Interaction
     */
	async execute(interaction, client) {
		await interaction.deferReply();

		const member = interaction.options.getMember('discord_user') || interaction.member;

		if (member.user.bot) {
			return interaction.editReply({
				content: "❌ You cannot manage XP for bot users!",
				flags: ['Ephemeral']
			});
		}

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