const FileLoader = require('./FileLoader');
const { REST, Routes, SlashCommandBuilder } = require('discord.js');
const token = process.env.token;
const { clientId, guildId } = require('../../config.json');
const rest = new REST().setToken(token);

/**
 * @typedef {Object} CommandStatus
 * @property {string} Command - Command Name
 * @property {string} Status - Command status emoji
 */
const createCommandStatus = (name, success) => ({
	Command: name,
	Status: success ? '✅' : '❌',
});
const getCommandName = (file) => file.split('/').pop().slice(0, -3);
const isValidCommand = (command) => {
	return command && command.data instanceof SlashCommandBuilder && !command.disabled;
};

async function loadCommands(client) {
	console.time('Loaded Commands');

	try {
		await client.commands.clear();
		const commandsArray = [];
		const commands = [];
		const files = await FileLoader.loadFiles('Commands');

		await Promise.all(files.map(async (file) => {
			try {
				const command = require(file);
				const commandName = command?.data?.name || getCommandName(file);

				if (!isValidCommand(command)) {
					commands.push(createCommandStatus(commandName, false));
				}
				else {
					await client.commands.set(command.data.name, command);
					commandsArray.push(command.data.toJSON());
					commands.push(createCommandStatus(command.data.name, true));
				}
			}
			catch (error) {
				console.error(`Failed to load command ${file}:`, error);
				commands.push(createCommandStatus(getCommandName(file), false));
			}
		}));

		try {
			console.log('Started refreshing application (/) commands');

			await rest.put(
				Routes.applicationGuildCommands(clientId, guildId),
				{ body: commandsArray },
			);

			console.log('Successfully reloaded application (/) commands');
		}
		catch (error) {
			console.error('Failed to deploy commands:', error);
		}

		console.table(commands, ['Command', 'Status']);
		console.info('\n\x1b[36m%s\x1b[0m', 'Loaded Commands');
	}
	catch (error) {
		console.error('Fatal error while loading commands:', error);
		throw error;
	}
	finally {
		console.timeEnd('Loaded Commands');
	}
}

module.exports = loadCommands;