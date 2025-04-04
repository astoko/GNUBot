/* eslint-disable no-unused-vars */
const {
	ChatInputCommandInteraction,
	AttachmentBuilder,
	ActionRowBuilder,
	ButtonBuilder,
	ButtonStyle,
	ApplicationCommandOptionType,
	PermissionFlagsBits,
} = require('discord.js');
const XpSchema = require('../../database/Xp');
const { Profile } = require('discord-arts');

module.exports = {
	name: 'xpchange',
	description: 'Changes someones xp or level',
	options: [
		{
			name: 'discord_user',
			description: 'The discord user to change information on',
			type: ApplicationCommandOptionType.User,
			required: true,
		},
	],
	disabled: false,
	permissions: [ PermissionFlagsBits.Administrator ],

	/**
     * Executes the xpchange command
     * @param {ChatInputCommandInteraction} interaction - Command Interaction
     */
	async execute(interaction, client) {
		await interaction.deferReply();

		const member = interaction.options.getMember('discord_user');

		if (member.user.bot) {
			return interaction.editReply({
				content: '❌ You cannot manage XP for bot users!',
				flags: ['Ephemeral'],
			});
		}

		let user = await XpSchema.findOne({ guildId: interaction.guild.id, discordId: member.id });

		if (!user) {
			user = new XpSchema({
				guildId: interaction.guild.id,
				discordId: member.id,
				xp: '0',
				level: '1',
			});
			await user.save();
		}

		const users = await XpSchema.find({ guildId: member.guild.id }).sort({ level: -1 });
		const userRank = users.findIndex(usr => usr.discordId === member.id) + 1;
		const presenceStatus = member.presence?.status || 'offline';

		const profileBuffer = await Profile(member.id, {
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
		const attachment = new AttachmentBuilder(profileBuffer, { name: 'profile.png' });

		const buttons = new ActionRowBuilder().addComponents(
			new ButtonBuilder()
				.setCustomId(`xp_change_xp_${interaction.user.id}_${member.id}`)
				.setLabel('Change XP')
				.setStyle(ButtonStyle.Primary),
			new ButtonBuilder()
				.setCustomId(`xp_change_level_${interaction.user.id}_${member.id}`)
				.setLabel('Change Level')
				.setStyle(ButtonStyle.Primary),
			new ButtonBuilder()
				.setCustomId(`xp_delete_${interaction.user.id}_${member.id}`)
				.setLabel('Delete Data')
				.setStyle(ButtonStyle.Danger),
			new ButtonBuilder()
				.setCustomId(`xp_exit_${interaction.user.id}_${member.id}`)
				.setLabel('Exit')
				.setStyle(ButtonStyle.Secondary),
		);

		await interaction.editReply({
			content: `Managing XP for ${member.user.tag}`,
			files: [attachment],
			components: [buttons],
		});
	},
};