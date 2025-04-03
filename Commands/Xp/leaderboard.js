/* eslint-disable no-unused-vars */
const { ChatInputCommandInteraction, SlashCommandBuilder, EmbedBuilder } = require('discord.js');
const XpSchema = require('../../database/Xp');
const { TopLeaderboardImage } = require('../../src/utils/XpManager');

module.exports = {
	data: new SlashCommandBuilder()
		.setName('leaderboard')
		.setDescription('View the leaderboard of XP and levels'),
	disabled: false,
	permissions: [],

	/**
     * Executes the leaderboard command
     * @param {ChatInputCommandInteraction} interaction - Command Interaction
     */
	async execute(interaction, client) {
		await interaction.deferReply();

		const users = await XpSchema.find({ guildId: interaction.guild.id }).sort({ level: -1 });

		if (!users) {
			return await interaction.editReply({ embeds: [
				new EmbedBuilder()
					.setColor('Red')
					.setDescription('❌ I could not find any valid members with a level'),
			] });
		}

		const usersData = await Promise.all(
			users.slice(0, 10).map(async (user, index) => {
				try {
					if (!user.discordId) return null;

					const fetchedUser = await client.users.fetch(user.discordId);
					return {
						top: index + 1,
						tag: fetchedUser.username,
						avatar: fetchedUser.displayAvatarURL({
							format: 'png',
							dynamic: true,
						}),
						level: user.level,
					};
				}
				catch (error) {
					console.error(`Error fetching user ${user.discordId}:`, error);
					return null;
				}
			}),
		);

		const validUsersData = usersData.filter(user => user !== null).slice(0, 10);

		if (validUsersData.length === 0) {
			return await interaction.editReply({ embeds: [
				new EmbedBuilder()
					.setColor('Red')
					.setDescription('Could not fetch any valid users for the leaderboard'),
			] });
		}

		const top = await new TopLeaderboardImage()
			.setOpacity(0.5)
			.setLevelMessage('Level')
			.setUsersData(validUsersData)
			.setAbbreviateNumber(true)
			.build();

		await interaction.editReply({ files: [{ attachment: top, name: `top-${interaction.user.id}.png` }] });
	},
};