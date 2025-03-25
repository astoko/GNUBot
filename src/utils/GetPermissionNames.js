const { PermissionFlagsBits } = require('discord.js');

/**
 * Converts permission flag bits to readable permission names
 * @param {bigint | bigint[] | string | string[]} permissions - Single or Array of permission flag bits or names
 * @returns {string[]} - Array of readable permission names
 */
async function GetPermissionNames(permissions) {
	if (!permissions) return ['None'];

	const permsArray = Array.isArray(permissions) ? permissions : [permissions];
	if (!permsArray.length) return ['None'];

	const permissionNames = await Promise.all(permsArray.map(async perm => {
		if (typeof perm === 'string') {
			return perm.replace(/_/g, ' ')
				.toLowerCase()
				.replace(/\b\w/g, char => char.toUpperCase());
		}

		const permKey = await Promise.resolve(
			Object.keys(PermissionFlagsBits)
				.find(key => PermissionFlagsBits[key] == BigInt(perm)),
		);

		return permKey?.replace(/_/g, ' ') || 'Unknown Permission';
	}));

	return permissionNames;
}

module.exports = GetPermissionNames;