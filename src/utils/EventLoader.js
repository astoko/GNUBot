const FileLoader = require('./FileLoader');
const { Events } = require('discord.js');
const ConfigSchema = require('../../Database/Config');

/**
 * @typedef {Object} EventStatus
 * @property {string} Event - Event Name
 * @property {string} Status - Event status emoji
 */
const createEventStatus = (name, success) => ({
	Event: name,
	Status: success ? '✅' : '❌',
});
const getEventName = (file) => file.split('/').pop().slice(0, -3);
const isValidEvent = (event) => {
	return event &&
           event.name &&
           (Object.values(Events).includes(event.name));
};

async function loadEvents(client) {
	console.time('Loaded Events');

	try {
		client.events = new Map();
		const events = [];
		const files = await FileLoader.loadFiles('Events');

		const eventData = files.map(file => {
			const event = require(file);
			return {
				name: event?.name,
				disabled: event?.disabled || false,
			};
		}).filter(evt => evt.name);

		await Promise.all(files.map(async (file) => {
			try {
				const event = require(file);
				const eventName = event?.name || getEventName(file);

				if (!isValidEvent(event)) {
					events.push(createEventStatus(eventName, false));
					return;
				}

				const execute = async (...args) => {
					const guildId = args[0]?.guildId || args[0]?.guild?.id;

					if (guildId) {
						let guildConfig = await ConfigSchema.findOne({ guildId });

						if (!guildConfig) {
							guildConfig = await ConfigSchema.create({
								guildId,
								commands: [],
								events: eventData,
							});
						}
						else {
							const existingEvent = guildConfig.events.find(e => e.name === event.name);
							if (!existingEvent) {
								guildConfig.events.push({
									name: event.name,
									disabled: event.disabled || false,
								});
								await guildConfig.save();
							}
						}

						const eventConfig = guildConfig.events?.find(e => e.name === event.name);
						if (eventConfig?.disabled) return;
					}

					await event.execute(...args, client);
				};

				const target = event.rest ? client.rest : client;
				await target[event.once ? 'once' : 'on'](event.name, execute);
				await client.events.set(event.name, execute);
				events.push(createEventStatus(eventName, true));

			}
			catch (error) {
				console.error(`Failed to load event ${file}:`, error);
				events.push(createEventStatus(getEventName(file), false));
			}
		}));

		console.table(events, ['Event', 'Status']);
		console.info('\n\x1b[36m%s\x1b[0m', 'Loaded Events');
	}
	catch (error) {
		console.error('Fatal error while loading events:', error);
		throw error;
	}
	finally {
		console.timeEnd('Loaded Events');
	}
}

module.exports = loadEvents;