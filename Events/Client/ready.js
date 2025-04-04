/* eslint-disable no-unused-vars */
const { Client, Events } = require('discord.js');
const GiveawayManager = require('../../src/utils/GiveawayManager');
const LoadManager = require('../../src/utils/LoadManager');
const Config = require('../../database/Config');

module.exports = {
	name: Events.ClientReady,
	once: true,

	async execute(client) {
		try {
			await GiveawayManager.initialize(client);

			const commandFiles = await LoadManager.loadFiles('commands');
			const configs = await Config.find();
			const guilds = await client.guilds.fetch();

			const missingGuilds = [...guilds.values()]
				.filter(guild => !configs.find(c => c.guildId === guild.id))
				.map(guild => ({
					guildId: guild.id,
					commands: [],
					events: [],
				}));

			if (missingGuilds.length > 0) {
				await Config.insertMany(missingGuilds);
				configs.push(...missingGuilds);
			}

			await LoadManager.loadCommands(client, configs, commandFiles);

			console.log(`✅ ${client.user.tag} is ready to serve.`);
		}
		catch (error) {
			console.error('Error in ready event:', error);
		}
	},
};