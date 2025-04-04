const { Client, Collection, Partials } = require('discord.js');
const mongoose = require('mongoose');
const LoadManager = require('./utils/LoadManager');
const Config = require('../database/Config');

const client = new Client({
	intents: 3276799,
	partials: [
		Partials.Channel,
		Partials.GuildMember,
		Partials.GuildScheduledEvent,
		Partials.Message,
		Partials.Reaction,
		Partials.ThreadMember,
		Partials.User,
	],
	allowedMentions: {
		parse: ['roles', 'users'],
		repliedUser: true,
		Shards: 'auto',
	},
});

require('dotenv').config();

client.commands = new Collection();
client.events = new Collection();
client.commandCooldown = new Collection();
client.on('debug', (info) => {
	console.log(info);
});
(async () => {
	try {
		await mongoose.connect(process.env.mongo);
		console.log('✅ MongoDB Connected');

		const eventFiles = await LoadManager.loadFiles('events');
		const configs = await Config.find();
		await LoadManager.loadEvents(client, configs, eventFiles);

		await client.login(process.env.token);
	}
	catch (error) {
		console.error('Startup error:', error);
		process.exit(1);
	}
})();