const { Schema, model } = require('mongoose');

const giveaway = new Schema ({
	messageId: String,
	channelId: String,
	guildId: String,
	prize: String,
	winnerCount: Number,
	endTime: Number,
	hosterId: String,
	participants: Array,
	ended: Boolean,
	winners: Array,
});

module.exports = model('giveaway', giveaway);