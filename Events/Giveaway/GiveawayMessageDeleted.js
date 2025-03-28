const { Events } = require('discord.js');
const GiveawayManager = require('../../src/utils/GiveawayManager');
const GiveawaySchema = require('../../Database/GiveawaySchema');

module.exports = {
	name: Events.MessageDelete,

	/**
     * Handles when a single giveaway message is deleted
     * @param {Message} message - The deleted message
     * @returns {Promise<void>}
     */
	async execute(message) {
		try {
			const giveaway = await GiveawaySchema.findOne({ messageId: message.id });

			if (giveaway) {
				await GiveawayManager.end_messageDeleted(message.id);
			}
		}
		catch (error) {
			console.error('Error handling giveaway message deletion:', error);
		}
	},
};