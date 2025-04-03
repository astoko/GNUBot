const { Collection } = require('discord.js');
const ConfigSchema = require('../../database/Config');

class CacheManager {
	constructor() {
		this.guildConfigs = new Collection();
		this.cacheTimeout = 5 * 60 * 1000;
	}

	/**
     * Retrieves guild configuration from cache or database
     * @param {string} guildId - Discord guild ID
     * @returns {Promise<Object|null>} Guild configuration object or null if not found
	 * @example getConfig(guildId)
     */
	async getConfig(guildId) {
		const cached = this.guildConfigs.get(guildId);
		if (cached && Date.now() - cached.timestamp < this.cacheTimeout) {
			return cached.data;
		}

		const config = await ConfigSchema.findOne({ guildId });
		if (config) {
			this.guildConfigs.set(guildId, {
				data: config,
				timestamp: Date.now(),
			});
		}
		return config;
	}

	/**
     * Forces a refresh of the guild configuration in cache
     * @param {string} guildId - Discord guild ID
     * @returns {Promise<Object|null>} Updated guild configuration object or null if not found
	 * @example refreshConfig(guildId)
     */
	async refreshConfig(guildId) {
		const config = await ConfigSchema.findOne({ guildId });
		if (config) {
			this.guildConfigs.set(guildId, {
				data: config,
				timestamp: Date.now(),
			});
		}
		return config;
	}

	/**
     * Removes guild configuration from cache
     * @param {string} guildId - Discord guild ID
	 * @example invalidateConfig(guildId)
     */
	invalidateConfig(guildId) {
		this.guildConfigs.delete(guildId);
	}
}

module.exports = new CacheManager();