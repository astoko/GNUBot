const { Schema, model } = require('mongoose');

const xp = new Schema({
	guildId: String,
	discordId: String,
	xp: { type: String, default: '0' },
	level: { type: String, default: '1' },
});

module.exports = model('xp', xp);