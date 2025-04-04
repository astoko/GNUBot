/* eslint-disable no-unused-vars */
const {
	Events,
	ButtonInteraction,
	ActionRowBuilder,
	ButtonBuilder,
	ButtonStyle,
	AttachmentBuilder,
	ModalBuilder,
	TextInputBuilder,
	TextInputStyle,
} = require('discord.js');
const XpSchema = require('../../database/Xp');
const { Profile } = require('discord-arts');

module.exports = {
	name: Events.InteractionCreate,

	/**
     * Executes giveaway button interaction
     * @param {ButtonInteraction} interaction - Button interaction object
     * @returns {Promise<void>}
     */
	async execute(interaction) {
		if (!interaction.isButton()) return;

		const customIdParts = interaction.customId.split('_');
		if (customIdParts[0] !== 'xp') return;
		const [type, action, type2, authorId, targetId] = customIdParts;

		console.log({
			buttonCustomId: interaction.customId,
			customIdParts,
			buttonUserId: interaction.user.id,
			authorId: authorId,
			match: interaction.user.id === authorId,
		});

		if (interaction.user.id !== authorId) {
			return interaction.reply({
				content: '❌ You cannot use these buttons as you did not run the command!',
				flags: ['Ephemeral'],
			});
		}

		const member = await interaction.guild.members.fetch(targetId);
		const user = await XpSchema.findOne({ guildId: interaction.guild.id, discordId: targetId });

		if (action === 'exit') {
			const users = await XpSchema.find({ guildId: interaction.guild.id }).sort({ level: -1 });
			const userRank = users.findIndex(usr => usr.discordId === targetId) + 1;
			const presenceStatus = member.presence?.status || 'offline';

			const profileBuffer = await Profile(targetId, {
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

			return interaction.update({
				content: 'Change Menu Exited - Final Profile',
				files: [attachment],
				components: [],
			});
		}

		if (action === 'delete') {
			await XpSchema.findOneAndDelete({ guildId: interaction.guild.id, discordId: targetId });
			return interaction.update({
				content: `✅ XP data deleted for ${member.user.tag}`,
				components: [],
				files: [],
			});
		}

		const modal = new ModalBuilder()
			.setCustomId(`xp_modal_${action}_${authorId}_${targetId}`)
			.setTitle(`${action === 'change_xp' ? 'XP' : 'Level'} Modification`);

		const operationInput = new TextInputBuilder()
			.setCustomId('operation')
			.setLabel('Operation (add/remove/set/multiply/divide)')
			.setStyle(TextInputStyle.Short)
			.setRequired(true);

		const valueInput = new TextInputBuilder()
			.setCustomId('value')
			.setLabel(`Enter ${action === 'change_xp' ? 'XP' : 'Level'} value`)
			.setStyle(TextInputStyle.Short)
			.setRequired(true);

		modal.addComponents(
			new ActionRowBuilder().addComponents(operationInput),
			new ActionRowBuilder().addComponents(valueInput),
		);

		await interaction.showModal(modal);

		try {
			const modalResponse = await interaction.awaitModalSubmit({
				time: 300000,
				filter: i => i.customId.startsWith('xp_modal') && i.user.id === authorId,
			});

			const operation = modalResponse.fields.getTextInputValue('operation').toLowerCase();
			const value = parseInt(modalResponse.fields.getTextInputValue('value'));

			if (isNaN(value) || value < 0) {
				return modalResponse.reply({
					content: '❌ Please provide a valid positive number!',
					flags: ['Ephemeral'],
				});
			}

			if (!['add', 'remove', 'set', 'multiply', 'divide'].includes(operation)) {
				return modalResponse.reply({
					content: '❌ Invalid operation! Use add, remove, set, multiply, or divide.',
					flags: ['Ephemeral'],
				});
			}

			const field = action === 'change_xp' ? 'xp' : 'level';
			const currentValue = parseInt(user[field]);
			let newValue = currentValue;

			switch (operation) {
			case 'add': newValue += value; break;
			case 'remove': newValue = Math.max(field === 'level' ? 1 : 0, currentValue - value); break;
			case 'set': newValue = value; break;
			case 'multiply': newValue *= value; break;
			case 'divide': newValue = Math.floor(currentValue / value); break;
			}

			if (field === 'level' && newValue < 1) newValue = 1;
			if (field === 'xp' && newValue < 0) newValue = 0;

			user[field] = newValue.toString();
			await user.save();

			const users = await XpSchema.find({ guildId: interaction.guild.id }).sort({ level: -1 });
			const userRank = users.findIndex(usr => usr.discordId === targetId) + 1;
			const presenceStatus = member.presence?.status || 'offline';

			const profileBuffer = await Profile(targetId, {
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
					.setCustomId(`xp_change_xp_${authorId}_${targetId}`)
					.setLabel('Change XP')
					.setStyle(ButtonStyle.Primary),
				new ButtonBuilder()
					.setCustomId(`xp_change_level_${authorId}_${targetId}`)
					.setLabel('Change Level')
					.setStyle(ButtonStyle.Primary),
				new ButtonBuilder()
					.setCustomId(`xp_delete_${authorId}_${targetId}`)
					.setLabel('Delete Data')
					.setStyle(ButtonStyle.Danger),
				new ButtonBuilder()
					.setCustomId(`xp_exit_${authorId}_${targetId}`)
					.setLabel('Exit')
					.setStyle(ButtonStyle.Secondary),
			);

			await modalResponse.update({
				content: `Operation: ${operation} ${value} ${field}\nNew ${field}: ${newValue}`,
				files: [attachment],
				components: [buttons],
			});

			setTimeout(async () => {
				try {
					const finalprofileBuffer = await Profile(targetId, {
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

					const finalAttachment = new AttachmentBuilder(finalprofileBuffer, { name: 'profile.png' });

					await interaction.editReply({
						content: 'Change Menu Exited Automatically - Final Profile',
						files: [finalAttachment],
						components: [],
					});
				}
				catch (error) {
					console.error('Failed to clear buttons:', error);
				}
			}, 300000);

		}
		catch (error) {
			if (error.code === 'InteractionCollectorError') {
				await interaction.editReply({
					content: 'Change Menu Exited Automatically',
					components: [],
					files: [],
				});
			}
			else {
				console.error('Error in XP button interaction:', error);
			}
		}
	},
};