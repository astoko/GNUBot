/* eslint-disable no-unused-vars */
const { Client, Events } = require('discord.js');
const loadCommands = require('../../src/utils/CommandLoader');
const GiveawayManager = require('../../src/utils/GiveawayManager');
const mongoose = require('mongoose');

module.exports = {
	name: Events.ClientReady,
	once: true,

	/**
     * Executes when the client is ready
     * @param {Client} client - Discord client instance
     * @returns {Promise<void>}
     */
	async execute(client) {
		await mongoose.connect(process.env.mongo).then(async () => {
			console.log('✅ Mongoose Database Connected');
		});

		await GiveawayManager.initialize(client);
		await loadCommands(client);

		console.log(`✅ ${client.user.tag} is now online.`);
	},
};