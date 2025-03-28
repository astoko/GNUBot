/* eslint-disable no-unsafe-negation */
const FileLoader = require('./FileLoader');
const { REST, Routes, SlashCommandBuilder } = require('discord.js');
const token = process.env.token;
const rest = new REST().setToken(token);
const ConfigSchema = require('../../Database/Config');

const BATCH_SIZE = 25;

async function loadCommands(client) {
	console.time('Command Loading');
	console.log('\n=== Starting Command Loading ===');

	try {
		await client.commands.clear();
		const commands = new Map();

		console.log('📂 Loading command files...');
		const files = await FileLoader.loadFiles('Commands');
		console.log(`📝 Found ${files.length} command files`);

		await Promise.all(files.map(async (file) => {
			try {
				const command = require(file);
				if (!command?.data instanceof SlashCommandBuilder) {
					console.error(`❌ Invalid command structure: ${file}`);
					return;
				}
				commands.set(command.data.name, command);
			}
			catch (error) {
				console.error(`❌ Failed to load ${file}:`, error);
			}
		}));

		const defaultCommandSettings = Array.from(commands.values()).map(cmd => ({
			name: cmd.data.name,
			disabled: cmd.disabled || false,
			permissions: cmd.permissions || [],
			roles: [],
		}));

		console.log('🔄 Loading guild configurations...');
		const guilds = await client.guilds.fetch();
		const existingConfigs = await ConfigSchema.find({});

		const guildConfigs = await Promise.all([...guilds.values()].map(async guild => {
			let config = existingConfigs.find(c => c.guildId === guild.id);

			if (!config) {
				config = new ConfigSchema({
					guildId: guild.id,
					commands: defaultCommandSettings,
				});
				await config.save();
				console.log(`📝 Created new config for guild: ${guild.id}`);
			}
			return config;
		}));

		const commandData = Array.from(commands.values()).map(cmd => cmd.data.toJSON());
		let processed = 0;

		for (let i = 0; i < guildConfigs.length; i += BATCH_SIZE) {
			const batch = guildConfigs.slice(i, i + BATCH_SIZE);

			await Promise.all(batch.map(async (config) => {
				if (!config?.guildId) return;

				try {
					await rest.put(
						Routes.applicationGuildCommands(client.user.id, config.guildId),
						{ body: commandData },
					);

					const updatedCommands = commandData.map(cmd => {
						const existingCommand = config.commands?.find(c => c.name === cmd.name);
						return {
							name: cmd.name,
							disabled: existingCommand?.disabled ?? (commands.get(cmd.name)?.disabled || false),
							permissions: existingCommand?.permissions ?? (commands.get(cmd.name)?.permissions || []),
							roles: existingCommand?.roles ?? [],
						};
					});

					config.commands = updatedCommands;
					await config.save();

					processed++;
					if (processed % 10 === 0) {
						console.log(`Progress: ${processed}/${guildConfigs.length} guilds`);
					}
				}
				catch (error) {
					console.error(`Failed to update guild ${config.guildId}:`, error);
				}
			}));

			if (i + BATCH_SIZE < guildConfigs.length) {
				await new Promise(resolve => setTimeout(resolve, 100));
			}
		}

		client.commands = commands;

		console.log('\n=== Command Loading Summary ===');
		console.log(`✅ Commands loaded: ${commands.size}`);
		console.log(`📊 Guilds processed: ${processed}/${guildConfigs.length}`);
		console.log('=== Command Loading Complete ===\n');
	}
	catch (error) {
		console.error('❌ Fatal error while loading commands:', error);
		throw error;
	}
	finally {
		console.timeEnd('Command Loading');
	}
}

module.exports = loadCommands;