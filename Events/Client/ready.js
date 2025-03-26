/* eslint-disable no-unused-vars */
const { Client, Events } = require('discord.js');
const loadCommands = require('../../src/utils/CommandLoader');
const DatabaseManager = require('../../src/utils/DatabaseManager');
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
		await DatabaseManager.initialize();
		await GiveawayManager.initialize(client);
		await loadCommands(client);

		console.log(`${client.user.tag} is now online.`);
	},
};