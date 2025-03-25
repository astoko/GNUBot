const FileLoader = require('./FileLoader');
const { Events } = require('discord.js');

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
           (Object.values(Events).includes(event.name)) &&
           (!event.disabled || event.disabled !== true);
};

async function loadEvents(client) {
	console.time('Loaded Events');

	try {
		client.events = new Map();
		const events = [];
		const files = await FileLoader.loadFiles('Events');

		await Promise.all(files.map(async (file) => {
			try {
				const event = require(file);
				const eventName = event?.name || getEventName(file);

				if (!isValidEvent(event)) {
					events.push(createEventStatus(eventName, false));
				}
				else {
					const execute = async (...args) => await event.execute(...args, client);
					const target = event.rest ? client.rest : client;

					await target[event.once ? 'once' : 'on'](event.name, execute);
					await client.events.set(event.name, execute);

					events.push(createEventStatus(eventName, true));
				}
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