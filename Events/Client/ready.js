/* eslint-disable no-unused-vars */
const { Client, Events } = require('discord.js');
const loadCommands = require('../../src/utils/CommandLoader');
const Database = require('better-sqlite3');
const { join } = require('path');

module.exports = {
	name: Events.ClientReady,
	once: true,

	/**
     *
     * @param {Client} client
     */
	async execute(client) {
		const db = new Database(join(process.cwd(), 'data.db'));
		db.exec(`
            CREATE TABLE IF NOT EXISTS guilds (
                guildId TEXT PRIMARY KEY,
                settings TEXT
            );
            -- Add more as needed
        `);
		client.db = db;

		console.log('SQLite3 Database Connected');
		console.log(`${client.user.tag} is now online.`);

		await loadCommands(client);
	},
};