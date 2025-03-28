const { Schema, model } = require('mongoose');

const config = new Schema({
	guildId: String,
	commands: [{
		name: String,
		disabled: Boolean,
		permissions: [String],
		roles: [String],
		defaultPermissions: [String],
	}],
	events: [{
		name: String,
		disabled: Boolean,
	}],
});

module.exports = model('config', config);