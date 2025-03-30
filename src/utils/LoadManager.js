/* eslint-disable no-unsafe-negation */
/* eslint-disable no-unused-vars */
const { Client, Events, SlashCommandBuilder } = require('discord.js');
const Config = require('../../Database/Config');
const FileLoader = require('./FileLoader');

class LoadManager {
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

		await Promise.all(files.map(async file => {
			try {
				const event = require(file);
				const eventName = event?.name || file.split('/').pop().slice(0, -3);

				if (!event?.name || !validEvents.has(event.name) || event.disabled) {
					eventStatus.push({ Event: eventName, Status: '❌', Type: event?.rest ? 'REST' : 'Client' });
					return;
				}

				const execute = (...args) => event.execute(...args, client);
				(event.rest ? client.rest : client)[event.once ? 'once' : 'on'](event.name, execute);

				events.set(event.name, { event, execute });
				eventStatus.push({ Event: eventName, Status: '✅', Type: event.rest ? 'REST' : 'Client' });
			}
			catch (error) {
				console.error(`Failed to load event ${file}:`, error);
				eventStatus.push({ Event: file.split('/').pop().slice(0, -3), Status: '❌', Error: error.message });
			}
		}));

		if (configs.length > 0) {
			const bulkOps = configs.map(config => ({
				updateOne: {
					filter: { guildId: config.guildId },
					update: {
						$addToSet: {
							events: {
								$each: [...events.values()]
									.filter(evt => !config.events.some(e => e.name === evt.event.name))
									.map(evt => ({
										name: evt.event.name,
										disabled: evt.event.disabled || false,
									})),
							},
						},
					},
				},
			})).filter(op => op.updateOne.update.$addToSet.events.$each.length > 0);

			if (bulkOps.length > 0) await Config.bulkWrite(bulkOps);
		}

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

		if (bulkOps.length > 0) await Config.bulkWrite(bulkOps);

		await Promise.all([...commands.values()].map(cmd =>
			client.application?.commands.create(cmd.data.toJSON()),
		));

		client.commands = commands;

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
				FileLoader.loadFiles('Events'),
				FileLoader.loadFiles('Commands'),
			]);

			const guilds = await client.guilds.fetch();
			const configs = await Config.find();

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