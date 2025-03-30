const { Client, Collection, Partials } = require('discord.js');
const mongoose = require('mongoose');
const LoadManager = require('./utils/LoadManager');

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

mongoose.connect(process.env.mongo)
	.then(async () => {
		console.log('✅ MongoDB Connected');
		return await LoadManager.initialize(client);
	})
	.then(() => {
		console.log(`✅ ${client.user.tag} is now online.`);
	})
	.catch(error => {
		console.error('Startup error:', error);
		process.exit(1);
	});

client.login(process.env.token);