/* eslint-disable no-unused-vars */
const { SlashCommandBuilder,
	EmbedBuilder,
	ActionRowBuilder,
	StringSelectMenuBuilder,
	ComponentType,
	ChatInputCommandInteraction,
	AutocompleteInteraction,
	PermissionFlagsBits,
} = require('discord.js');
const { readdir } = require('fs/promises');
const { join } = require('path');
const GetPermissionNames = require('../../src/utils/GetPermissionNames');

module.exports = {
	data: new SlashCommandBuilder()
		.setName('help')
		.setDescription('Displays a list of bot commands')
		.addStringOption(option =>
			option
				.setName('command_name')
				.setDescription('Details about a specific command')
				.setAutocomplete(true)
				.setRequired(false),
		),
	disabled: false,
	permissions: [],

	/**
     * Handles command autocompletetion choices
     * @param {AutocompleteInteraction} interaction - Autocomplete Interaction
     */
	async autocomplete(interaction) {
		const focusedValue = interaction.options.getFocused().toLowerCase();
		const commands = Array.from(interaction.client.commands.values());
		const filtered = commands
			.filter(cmd => cmd.data.name.toLowerCase().startsWith(focusedValue))
			.slice(0, 25)
			.map(cmd => ({
				name: cmd.data.name,
				value: cmd.data.name,
			}));

		await interaction.respond(filtered);
	},

	/**
     * Executes the help command
     * @param {ChatInputCommandInteraction} interaction - Command Interaction
     */
	async execute(interaction) {
		await interaction.deferReply();

		const commandName = interaction.options.getString('command_name');

		if (commandName) {
			const command = await interaction.client.commands.get(commandName);

			if (!command) {
				return await interaction.editReply({
					content: '❌ Command not found.',
					flags: ['Ephemeral'],
				});
			}

			const permissionNames = await GetPermissionNames(command.permissions || []);
			const commandEmbed = new EmbedBuilder()
				.setTitle(`ℹ️ Command: ${command.data.name}`)
				.setDescription(command.data.description)
				.setColor('Green')
				.addFields(
					{ name: 'Status', value: command.disabled ? '❌ Disabled' : '✅ Enabled', inline: true },
					{ name: 'Required Permissions', value: `\`${permissionNames.join(', ')}\``, inline: true },
				)
				.setTimestamp();

			return await interaction.editReply({ embeds: [commandEmbed] });
		}
		try {
			const commandFolders = await readdir('./Commands');
			const commandsByDirectory = {};

			await Promise.all(
				commandFolders
					.filter(folder => !folder.startsWith('.'))
					.map(async (folder) => {
						const folderPath = join(process.cwd(), 'Commands', folder);
						const files = (await readdir(folderPath))
							.filter(file => file.endsWith('.js'));

						commandsByDirectory[folder] = files
							.map(async (file) => {
								const command = await interaction.client.commands.get(file.slice(0, -3));

								return command?.data && !command.deleted ? {
									name: command.data.name,
									description: command.data.description,
								} : null;
							})
							.filter(Boolean);
					}),
			);

			const selectMenu = new StringSelectMenuBuilder()
				.setCustomId('directory-select')
				.setPlaceholder('Select a Command Directory')
				.addOptions(
					Object.keys(commandsByDirectory).map(folder => ({
						label: folder,
						value: folder,
					})),
				);

			const embed = new EmbedBuilder()
				.setTitle('ℹ️ Help Menu')
				.setDescription('Select a Command Directory from the dropdown menu below to view commands in that directory.\n\nYou can view in-depth info by running:\n- /help <command_name>')
				.setColor('Green')
				.setTimestamp();

			const row = new ActionRowBuilder().addComponents(selectMenu);
			const response = await interaction.editReply({
				embeds: [embed],
				components: [row],
			});
			const collector = response.createMessageComponentCollector({
				componentType: ComponentType.StringSelect,
				filter: i => i.user.id === interaction.user.id,
				time: 60_000,
			});

			collector.on('collect', async i => {
				const selectedDirectory = i.values[0];
				const commands = commandsByDirectory[selectedDirectory];
				const embedsToSend = [];
				let currentEmbed = new EmbedBuilder()
					.setTitle(`${selectedDirectory} Commands`)
					.setDescription('List of all commands in this Directory')
					.setColor('Green');

				let currentFields = [];
				let currentCharCount = currentEmbed.data.title.length + currentEmbed.data.description.length;
				let pageCount = 1;

				for (const cmd of commands) {
					const fieldChars = cmd.name.length + cmd.description.length;

					if (currentFields.length >= 25 || currentCharCount + fieldChars >= 6000) {
						currentEmbed.addFields(currentFields);
						embedsToSend.push(currentEmbed);

						pageCount++;
						currentEmbed = new EmbedBuilder()
							.setTitle(`ℹ️ ${selectedDirectory} Commands (Page ${pageCount})`)
							.setDescription('List of all commands in this Directory')
							.setColor('Green')
							.setTimestamp();

						currentFields = [];
						currentCharCount = currentEmbed.data.title.length + currentEmbed.data.description.length;
					}

					const truncatedDescription = cmd.description.length > 1024
						? cmd.description.substring(0, 1021) + '...'
						: cmd.description;

					currentFields.push({
						name: cmd.name,
						value: truncatedDescription,
					});
					currentCharCount += fieldChars;
				}

				if (currentFields.length > 0) {
					currentEmbed.addFields(currentFields);
					embedsToSend.push(currentEmbed);
				}

				await i.update({ embeds: embedsToSend });
			});

			collector.on('end', async () => {
				if (!response.deleted) {
					selectMenu.setDisabled(true);
					await interaction.editReply({ components: [row] });
				}
			});

		}
		catch (error) {
			console.error('Error in help command:', error);

			if (!interaction.replied && !interaction.deferred) {
				return await interaction.reply({
					content: '❌ An error occurred while fetching commands.',
					flags: ['Ephemeral'],
				});
			}

			return await interaction.editReply({
				content: '❌ An error occurred while fetching commands.',
				embeds: [],
				components: [],
				flags: ['Ephemeral'],
			});
		}
	},
};