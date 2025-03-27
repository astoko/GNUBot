const { Events } = require('discord.js');
const GiveawayManager = require('../../src/utils/GiveawayManager');

module.exports = {
	name: Events.InteractionCreate,

	/**
     * Executes giveaway button interaction
     * @param {ButtonInteraction} interaction - Button interaction object
     * @returns {Promise<void>}
     */
	async execute(interaction) {
		if (!interaction.isButton() || interaction.customId !== 'giveaway-join') return;

		try {
			await interaction.deferReply({ flags: ['Ephemeral'] });

			const messageId = interaction.message.id;
			const giveaway = await GiveawayManager.giveaways.findOne({ messageId: messageId });

			if (!giveaway) {
				return interaction.editReply({
					content: '❌ Could not find this giveaway!',
					flags: ['Ephemeral'],
				});
			}

			if (giveaway.ended === true || giveaway.ended === 'true' || giveaway.ended === '1') {
				return interaction.editReply({
					content: '❌ This giveaway has ended!',
					flags: ['Ephemeral'],
				});
			}

			const userId = interaction.user.id;
			if (giveaway.participants.includes(userId)) {
				return interaction.editReply({
					content: '❌ You have already joined this giveaway!',
					flags: ['Ephemeral'],
				});
			}

			const newParticipants = [...giveaway.participants, userId];
			await GiveawayManager.giveaways.updateOne(
				{ messageId: interaction.message.id },
				{ $set: { participants: newParticipants } },
			);

			const updatedGiveaway = await GiveawayManager.giveaways.findOne({ messageId: interaction.message.id });
			await interaction.message.edit({
				embeds: [GiveawayManager.createEmbed(updatedGiveaway)],
				components: [GiveawayManager.createButtons()],
			});

			return interaction.editReply({
				content: '✅ You have joined the giveaway!',
				flags: ['Ephemeral'],
			});
		}
		catch (error) {
			console.error('Error in giveaway button interaction:', error);
			return interaction.editReply({
				content: '❌ Failed to join the giveaway. Please try again.',
				flags: ['Ephemeral'],
			});
		}
	},
};