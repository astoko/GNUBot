const { glob } = require('glob');
const path = require('path');

/**
 * @class FileLoader
 * @description Handles loading files and caching
 */
class FileLoader {
	/**
     * Deletes file from required cache if it exists
     * @param {string} file - File path to delete from the cache
     */
	static deleteCachedFile(file) {
		const filePath = path.resolve(file);

		if (require.cache[filePath]) {
			delete require.cache[filePath];
		}
	}

	/**
     * Loads JS files from a directory
     * @param {string} dirName - Directory to scan for files
     * @returns {Promise<string[]>} - Returns array of file paths
     */
	static async loadFiles(dirName) {
		try {
			const globPattern = path.join(process.cwd(), dirName, '**/*.js').replace(/\\/g, '/');
			const files = await glob(globPattern);
			const jsFiles = files.filter(file => path.extname(file) === '.js');

			await Promise.all(jsFiles.map(file => {
				this.deleteCachedFile(file);

				return Promise.resolve();
			}));

			return jsFiles;
		}
		catch (error) {
			console.error(`Error loading files from directory ${dirName}:`, error);
			throw error;
		}
	}
}

module.exports = FileLoader;