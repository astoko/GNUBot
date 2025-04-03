/* eslint-disable no-unsafe-negation */
/* eslint-disable no-unused-vars */
const { Client, Events, SlashCommandBuilder } = require('discord.js');
const { glob } = require('glob');
const path = require('path');
const Config = require('../../database/Config');
const CacheManager = require('./CacheManager');

class LoadManager {
	/**
     * Deletes file from required cache if it exists
     * @private
     * @param {string} file - File path to delete from the cache
     */
	static #deleteCachedFile(file) {
		const filePath = path.resolve(file);
		if (require.cache[filePath]) delete require.cache[filePath];
	}

	/**
     * Loads JS files from a directory
     * @private
     * @param {string} dirName - Directory to scan for files
     * @returns {Promise<string[]>} - Returns array of file paths
     */
	static async #loadFiles(dirName) {
		try {
			const globPattern = path.join(process.cwd(), dirName, '**/*.js').replace(/\\/g, '/');
			const files = await glob(globPattern);
			const jsFiles = files.filter(file => path.extname(file) === '.js');
			await Promise.all(jsFiles.map(file => {
				this.#deleteCachedFile(file);
				return Promise.resolve();
			}));
			return jsFiles;
		}
		catch (error) {
			console.error(`Error loading files from directory ${dirName}:`, error);
			throw error;
		}
	}

	/**
     * Loads and registers all events
     * @param {Client} client - Discord client
     * @param {Array} configs - Existing guild configs
     * @param {Array} files - Event files to load
     */
	static async loadEvents(client, configs, files) {
		console.time('Events Loaded');
		const events = new Map();
		const eventStatus = [];
		const validEvents = new Set(Object.values(Events));

		for (const file of files) {
			try {
				const event = require(file);
				const eventName = path.basename(file, '.js');

				if (event?.name && validEvents.has(event.name) && event.disabled !== true) {
					events.set(eventName, {
						event,
						disabled: event.disabled || false,
					});
				}
			}
			catch (error) {
				console.error(`Failed to pre-load event ${file}:`, error);
			}
		}

		if (configs.length > 0) {
			const bulkOps = configs.map(config => ({
				updateOne: {
					filter: { guildId: config.guildId },
					update: {
						$addToSet: {
							events: {
								$each: [...events.entries()].map(([evtName, evt]) => ({
									name: evtName,
									disabled: evt.disabled || false,
								})),
							},
						},
					},
				},
			}));

			if (bulkOps.length > 0) {
				await Config.bulkWrite(bulkOps);
				console.info(`Updated events configuration for ${bulkOps.length} guilds`);
			}
		}

		await Promise.all(files.map(async file => {
			try {
				const event = require(file);
				const eventName = path.basename(file, '.js');
				const eventPath = file.split('Events/').pop().replace('.js', '');

				if (!event?.name || !validEvents.has(event.name) || event.disabled === true) {
					eventStatus.push({
						Event: eventName,
						Status: '❌',
						Type: event?.rest ? 'REST' : 'Client',
					});
					return;
				}

				const execute = async (...args) => {
					const interaction = args[0];
					if (interaction?.guildId) {
						const config = await CacheManager.getConfig(interaction.guildId);
						if (config) {
							const eventConfig = config.events?.find(evt => evt.name === eventPath);
							const isClientEvent = file.includes('/Client/') || file.includes('\\Client\\');
							if (isClientEvent) {
								if (event.disabled === true) return;
							}
							else if (eventConfig?.disabled === true) {
								return;
							}
						}
					}
					return event.execute(...args, client);
				};

				(event.rest ? client.rest : client)[event.once ? 'once' : 'on'](event.name, execute);
				events.set(eventPath, { event, execute });
				eventStatus.push({
					Event: eventName,
					Status: '✅',
					Type: event.rest ? 'REST' : 'Client',
				});
			}
			catch (error) {
				console.error(`Failed to load event ${file}:`, error);
				eventStatus.push({
					Event: path.basename(file, '.js'),
					Status: '❌',
					Error: error.message,
				});
			}
		}));

		client.events = new Map([...events].map(([name, { execute }]) => [name, execute]));

		console.info('\n=== Events Loading Summary ===');
		console.table(eventStatus, ['Event', 'Status', 'Type']);
		console.timeEnd('Events Loaded');
		return { size: events.size, status: eventStatus };
	}

	/**
     * Loads and registers all commands
     * @param {Client} client - Discord client
     * @param {Array} configs - Existing guild configs
     * @param {Array} files - Command files to load
     */
	static async loadCommands(client, configs, files) {
		console.time('Commands Loaded');
		const commands = new Map();
		const commandStatus = [];

		for (const file of files) {
			try {
				const command = require(file);
				if (command?.data instanceof SlashCommandBuilder && !command.disabled) {
					commands.set(command.data.name, command);
				}
			}
			catch (error) {
				console.error(`Failed to pre-load command ${file}:`, error);
			}
		}

		if (configs.length > 0) {
			const bulkOps = configs.map(config => ({
				updateOne: {
					filter: { guildId: config.guildId },
					update: {
						$addToSet: {
							commands: {
								$each: [...commands.values()]
									.filter(cmd => !config.commands.find(c => c.name === cmd.data.name))
									.map(cmd => ({
										name: cmd.data.name,
										disabled: cmd.disabled || false,
										permissions: cmd.permissions || [],
										roles: cmd.roles || [],
										defaultPermissions: cmd.defaultPermissions || [],
									})),
							},
						},
					},
				},
			})).filter(op => op.updateOne.update.$addToSet.commands.$each.length > 0);

			if (bulkOps.length > 0) {
				await Config.bulkWrite(bulkOps);
				console.info(`Updated commands configuration for ${bulkOps.length} guilds`);
			}
		}

		await Promise.all([...commands.values()].map(cmd =>
			client.application?.commands.create(cmd.data.toJSON()),
		));

		client.commands = commands;

		for (const file of files) {
			try {
				const command = require(file);
				const commandName = command?.data?.name || file.split('/').pop().slice(0, -3);

				if (!command?.data instanceof SlashCommandBuilder || command.disabled) {
					commandStatus.push({ Command: commandName, Status: '❌', Permissions: 'N/A' });
					continue;
				}

				commands.set(command.data.name, command);
				commandStatus.push({
					Command: commandName,
					Status: '✅',
				});
			}
			catch (error) {
				console.error(`Failed to load command ${file}:`, error);
				commandStatus.push({ Command: file.split('/').pop().slice(0, -3), Status: '❌', Error: error.message });
			}
		}

		console.info('\n=== Commands Loading Summary ===');
		console.table(commandStatus, ['Command', 'Status']);
		console.timeEnd('Commands Loaded');
		return { size: commands.size, status: commandStatus };
	}

	/**
     * Initializes all bot systems
     * @param {Client} client - Discord client
     */
	static async initialize(client) {
		console.time('Total Load Time');
		try {
			console.info('=== Starting Bot Initialization ===');
			client.events = new Map();
			await client.commands.clear();

			const [eventFiles, commandFiles] = await Promise.all([
				this.#loadFiles('events'),
				this.#loadFiles('commands'),
			]);

			const guilds = await client.guilds.fetch();
			const configs = await Config.find();
			const configUpdates = [];

			for (const config of configs) {
				await CacheManager.refreshConfig(config.guildId);
				const eventsToUpdate = config.events.filter(evt => {
					const file = eventFiles.find(f => f.includes(evt.name));
					if (!file) return false;
					const event = require(file);
					return evt.disabled !== event.disabled;
				});

				const commandsToUpdate = config.commands.filter(cmd => {
					const file = commandFiles.find(f => f.includes(cmd.name));
					if (!file) return false;
					const command = require(file);
					return cmd.disabled !== command.disabled;
				});

				if (eventsToUpdate.length > 0 || commandsToUpdate.length > 0) {
					configUpdates.push({
						updateOne: {
							filter: { guildId: config.guildId },
							update: {
								$set: {
									'events.$[evt].disabled': true,
									'commands.$[cmd].disabled': true,
								},
							},
							arrayFilters: [
								{ 'evt.name': { $in: eventsToUpdate.map(e => e.name) } },
								{ 'cmd.name': { $in: commandsToUpdate.map(c => c.name) } },
							],
						},
					});
				}
			}

			if (configUpdates.length > 0) {
				await Config.bulkWrite(configUpdates);
				console.info(`Updated disabled states for ${configUpdates.length} guild configs`);
			}

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
				console.info(`Created configs for ${missingGuilds.length} new guilds`);
			}

			const [eventResults, commandResults] = await Promise.all([
				this.loadEvents(client, configs, eventFiles),
				this.loadCommands(client, configs, commandFiles),
			]);

			console.info('\n=== Final Loading Summary ===');
			console.table({
				Events: { Total: eventFiles.length, Loaded: eventResults.size, Success: eventResults.status.filter(e => e.Status === '✅').length },
				Commands: { Total: commandFiles.length, Loaded: commandResults.size, Success: commandResults.status.filter(c => c.Status === '✅').length },
				Guilds: { Total: guilds.size, Configured: configs.length },
			});
		}
		catch (error) {
			console.error('Fatal error during initialization:', error);
			throw error;
		}
		finally {
			console.timeEnd('Total Load Time');
		}
	}
}

module.exports = LoadManager;