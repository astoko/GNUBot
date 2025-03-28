const { Events } = require('discord.js');
const GiveawayManager = require('../../src/utils/GiveawayManager');
const GiveawaySchema = require('../../Database/GiveawaySchema');

module.exports = {
	name: Events.MessageBulkDelete,

	/**
     * Handles when multiple messages are deleted, including potential giveaway messages
     * @param {Collection<string, Message>} messages - Collection of deleted messages
     * @returns {Promise<void>}
     */
	async execute(messages) {
		try {
			for (const message of messages.values()) {
				const giveaway = await GiveawaySchema.findOne({ messageId: message.id });

				if (giveaway) {
					await GiveawayManager.end_messageDeleted(message.id);
				}
			}
		}
		catch (error) {
			console.error('Error handling bulk giveaway message deletion:', error);
		}
	},
};