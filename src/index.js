const { Client, Collection, Partials } = require('discord.js');
const client = new Client({ intents: 3276799, partials: [Partials.Channel, Partials.GuildMember, Partials.GuildScheduledEvent, Partials.Message, Partials.Reaction, Partials.ThreadMember, Partials.User], allowedMentions: { parse: ['roles', 'users'], repliedUser: true } });

require('dotenv').config();

client.commands = new Collection();
client.events = new Collection();
client.commandCooldown = new Collection();
client.login(process.env.token);