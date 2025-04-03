/* eslint-disable no-unused-vars */
const { Client, Events, Guild } = require('discord.js');
const Config = require('../../database/Config');

module.exports = {
	name: Events.GuildCreate,

	/**
     * Executes when bot joins a new guild
     * @param {Guild} guild - The guild that was joined
     * @param {Client} client - Discord client instance
     * @returns {Promise<void>}
     */
	async execute(guild, client) {
		try {
			const existingConfig = await Config.findOne({ guildId: guild.id });

			if (!existingConfig) {
				await Config.create({
					guildId: guild.id,
					commands: [...client.commands.values()].map(cmd => ({
						name: cmd.data.name,
						disabled: cmd.disabled || false,
						permissions: cmd.permissions || [],
						roles: cmd.roles || [],
						defaultPermissions: cmd.defaultPermissions || [],
					})),
					events: Array.from(client.events.entries()).map(([eventPath, execute]) => ({
						name: eventPath.split('/').pop(),
						disabled: false,
					})),
				});

				console.log(`✅ Created new config for guild: ${guild.name} (${guild.id}).`);
				return;
			}

			console.log(`ℹ️ Config already exists for guild: ${guild.name} (${guild.id}).`);
		}
		catch (error) {
			console.error(`❌ Error handling guild join for ${guild.name} (${guild.id}):`, error);
		}
	},
};