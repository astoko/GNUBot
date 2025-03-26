const Database = require('better-sqlite3');
const fs = require('fs');

/**
 * @class DatabaseManager
 * @description Manages SQLite database with MongoDB-like syntax
 */
class DatabaseManager {
	/**
     * @constructor
     */
	constructor() {
		this.db = null;
		this.schemas = new Map();
		this.initialized = false;
	}

	isInitialized() {
		return this.initialized;
	}

	/**
 * Initializes the database and schemas
 * @returns {Promise<void>}
 */
	async initialize() {
		try {
			if (!fs.existsSync('Database')) {
				fs.mkdirSync('Database');
			}

			this.db = new Database('database.db');
			this.db.pragma('journal_mode = WAL');

			const schemaFiles = fs.readdirSync('Database')
				.filter(file => file.endsWith('.js'));

			for (const file of schemaFiles) {
				const schemaName = file.replace('.js', '').toLowerCase();
				const schema = require(`../../Database/${file}`);

				const columns = this.generateColumns(schema);
				this.db.prepare(`CREATE TABLE IF NOT EXISTS ${schemaName} (
                _id TEXT PRIMARY KEY,
                ${columns.join(',\n')}
            )`).run();

				this.schemas.set(schemaName, schema);
			}

			this.initialized = true;
			console.info('\x1b[36m%s\x1b[0m', 'Database Connected');
		}
		catch (error) {
			throw new Error(`Failed to initialize database: ${error.message}`);
		}
	}

	/**
     * Generates SQL columns from schema
     * @private
     * @param {Object} schema - Schema definition
     * @returns {string[]} Column definitions
     */
	generateColumns(schema) {
		const columns = [];
		for (const [key, type] of Object.entries(schema)) {
			if (key === '_id') continue;

			let sqlType = 'TEXT';
			if (type === Number) sqlType = 'INTEGER';
			else if (type === Array) sqlType = 'TEXT';

			columns.push(`${key} ${sqlType}`);
		}
		return columns;
	}

	/**
     * Prepare value for SQL storage
     * @private
     * @param {any} value - Value to prepare
     * @returns {string|number|null} SQL-safe value
     */
	prepareValue(value) {
		if (value === null || value === undefined) return null;
		if (typeof value === 'boolean') return value ? 1 : 0;
		if (typeof value === 'number') return value;
		if (Array.isArray(value) || typeof value === 'object') {
			return JSON.stringify(value);
		}
		return String(value);
	}

	/**
     * Parses a document from SQLite row
     * @private
     * @param {Object} row - Database row
     * @returns {Object} Parsed document
     */
	parseDocument(row) {
		const doc = { ...row };
		for (const [key, value] of Object.entries(doc)) {
			if (typeof value === 'string') {
				try {
					if (value.startsWith('[') || value.startsWith('{')) {
						doc[key] = JSON.parse(value);
					}
				}
				catch {
					doc[key] === value;
				}
			}

			// Handle boolean fields
			if (key === 'ended') {
				if (typeof value === 'boolean') {
					doc[key] = value;
				}
				else if (typeof value === 'number') {
					doc[key] = Boolean(value);
				}
				else if (typeof value === 'string') {
					doc[key] = value === 'true' || value === '1';
				}
			}
		}
		return doc;
	}

	/**
     * Creates a collection interface
     * @param {string} schemaName - Name of the schema
     * @returns {Object} Collection methods
     */
	collection(schemaName) {
		if (!this.isInitialized()) {
			throw new Error('Database not initialized. Call initialize() first.');
		}

		const schema = this.schemas.get(schemaName.toLowerCase());
		if (!schema) {
			throw new Error(`Schema ${schemaName} not found`);
		}

		return {
			/**
             * Finds documents in collection
             * @param {Object} query - Query filter
             * @returns {Promise<Array>} Matching documents
             */
			find: async (query = {}) => {
				try {
					let sql = `SELECT * FROM ${schemaName}`;
					const params = [];

					if (Object.keys(query).length > 0) {
						const where = [];
						for (const [key, value] of Object.entries(query)) {
							where.push(`${key} = ?`);
							params.push(this.prepareValue(value));
						}
						sql += ` WHERE ${where.join(' AND ')}`;
					}

					const stmt = this.db.prepare(sql);
					const results = stmt.all(...params);
					return results.map(row => this.parseDocument(row));
				}
				catch (error) {
					throw new Error(`Error in find operation for ${schemaName}: ${error.message}`);
				}
			},

			/**
             * Finds one document in collection
             * @param {Object} query - Query filter
             * @returns {Promise<Object|null>} Matching document
             */
			findOne: async (query = {}) => {
				try {
					let sql = `SELECT * FROM ${schemaName}`;
					const params = [];

					if (Object.keys(query).length > 0) {
						const where = [];
						for (const [key, value] of Object.entries(query)) {
							where.push(`${key} = ?`);
							params.push(value);
						}
						sql += ` WHERE ${where.join(' AND ')}`;
					}

					sql += ' LIMIT 1';
					const stmt = this.db.prepare(sql);
					const result = stmt.get(...params);

					return result ? this.parseDocument(result) : null;
				}
				catch (error) {
					throw new Error(`Error in findOne operation for ${schemaName}:`, error);
				}
			},

			/**
             * Inserts a document into collection
             * @param {Object} document - Document to insert
             * @returns {Promise<Object>} Inserted document
             */
			insertOne: async (document) => {
				try {
					if (!document._id) {
						document._id = Date.now().toString(36) + Math.random().toString(36).substr(2);
					}

					const columns = ['_id', ...Object.keys(document)];
					const values = columns.map(col => this.prepareValue(document[col]));
					const placeholders = columns.map(() => '?').join(', ');

					const sql = `INSERT INTO ${schemaName} (${columns.join(', ')}) VALUES (${placeholders})`;
					const stmt = this.db.prepare(sql);
					stmt.run(...values);

					return document;
				}
				catch (error) {
					throw new Error(`Error in insertOne operation for ${schemaName}: ${error.message}`);
				}
			},

			/**
             * Updates a document in collection
             * @param {Object} query - Query filter
             * @param {Object} update - Update operations
             * @returns {Promise<Object>} Update result
             */
			updateOne: async (query, update) => {
				try {
					const values = [];
					const setClause = Object.entries(update.$set)
						.map(([key, value]) => {
							values.push(this.prepareValue(value));
							return `${key} = ?`;
						})
						.join(', ');

					const whereValues = [];
					const whereClause = Object.entries(query)
						.map(([key, value]) => {
							whereValues.push(value);
							return `${key} = ?`;
						})
						.join(' AND ');

					const sql = `UPDATE ${schemaName} SET ${setClause} WHERE ${whereClause} LIMIT 1`;
					const stmt = this.db.prepare(sql);
					const result = stmt.run(...values, ...whereValues);

					return { updated: result.changes };
				}
				catch (error) {
					throw new Error(`Error in updateOne operation for ${schemaName}: ${error.message}`);
				}
			},

			/**
             * Deletes a document from collection
             * @param {Object} query - Query filter
             * @returns {Promise<Object>} Delete result
             */
			deleteOne: async (query) => {
				try {
					const values = [];
					const whereClause = Object.entries(query)
						.map(([key, value]) => {
							values.push(value);
							return `${key} = ?`;
						})
						.join(' AND ');

					const sql = `DELETE FROM ${schemaName} WHERE ${whereClause} LIMIT 1`;
					const stmt = this.db.prepare(sql);
					const result = stmt.run(...values);

					return { deleted: result.changes };
				}
				catch (error) {
					throw new Error(`Error in deleteOne operation for ${schemaName}:`, error);
				}
			},

			/**
             * Deletes multiple documents from collection
             * @param {Object} query - Query filter
             * @returns {Promise<Object>} Delete result
             */
			deleteMany: async (query = {}) => {
				try {
					const values = [];
					let sql = `DELETE FROM ${schemaName}`;

					if (Object.keys(query).length > 0) {
						const whereClause = Object.entries(query)
							.map(([key, value]) => {
								values.push(value);
								return `${key} = ?`;
							})
							.join(' AND ');
						sql += ` WHERE ${whereClause}`;
					}

					const stmt = this.db.prepare(sql);
					const result = stmt.run(...values);

					return { deleted: result.changes };
				}
				catch (error) {
					throw new Error(`Error in deleteMany operation for ${schemaName}:`, error);
				}
			},
		};
	}
}

module.exports = new DatabaseManager();