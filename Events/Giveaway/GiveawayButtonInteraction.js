const { Events } = require('discord.js');
const GiveawayManager = require('../../src/utils/GiveawayManager');
const GiveawaySchema = require('../../database/GiveawaySchema');

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

			const giveaway = await GiveawaySchema.findOneAndUpdate(
				{
					messageId: interaction.message.id,
					ended: false,
					participants: { $ne: interaction.user.id },
				},
				{ $addToSet: { participants: interaction.user.id } },
				{ new: true },
			);

			if (!giveaway) {
				return interaction.editReply({
					content: '❌ Could not join the giveaway. It may have ended or you\'ve already joined.',
					flags: ['Ephemeral'],
				});
			}

			await interaction.message.edit({
				embeds: [GiveawayManager.createEmbed(giveaway)],
				components: [GiveawayManager.createButtons()],
			});

			return interaction.editReply({
				content: '✅ You have joined the giveaway.',
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