/* eslint-disable no-unused-vars */
const { Client, Events } = require('discord.js');
const GiveawayManager = require('../../src/utils/GiveawayManager');

module.exports = {
	name: Events.ClientReady,
	once: true,

	/**
     * Executes when the client is ready
     * @param {Client} client - Discord client instance
     * @returns {Promise<void>}
     */
	async execute(client) {
		await GiveawayManager.initialize(client);
		console.log(`✅ ${client.user.tag} is ready to serve!`);
	},
};