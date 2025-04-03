const { Events, AttachmentBuilder } = require('discord.js');
const XpSchema = require('../../database/Xp');
const { LevelUpImage } = require('../../src/utils/XpManager');
const Cooldown = new Set();
const BigInt = require('big-integer');

module.exports = {
	name: Events.MessageCreate,

	/**
     * Handles when a message is sent
     * @param {Message} message - The message
     */
	async execute(message) {
		const userId = message.author.id;

		if (Cooldown.has(userId) || message.author.bot || message.system || message.interaction) return;

		const xpAmount = Math.floor(Math.random() * 100).toString();
		const user = await XpSchema.findOne({
			guildId: message.guild.id,
			discordId: userId,
		}) || await XpSchema.create({
			guildId: message.guild.id,
			discordId: userId,
			xp: '0',
			level: '1',
		});

		let currentXp = BigInt(user.xp);
		let currentLevel = BigInt(user.level);
		const oldLevel = currentLevel.toString();

		currentXp = currentXp.add(BigInt(xpAmount));

		if (currentXp.geq(currentLevel.multiply(BigInt('250')))) {
			Cooldown.add(userId);
			currentLevel = currentLevel.add(BigInt('1'));
			currentXp = BigInt('0');

			const notificationChannel = await message.channel;

			const card = await new LevelUpImage()
				.setLevels(parseInt(oldLevel), parseInt(currentLevel.toString()))
				.build();

			const attachment = new AttachmentBuilder(card, { name: 'profile.png' });

			await notificationChannel.send({ content: `<@${userId}>`, files: [attachment] });
			await XpSchema.updateOne(
				{ guildId: message.guild.id, discordId: userId },
				{ level: currentLevel.toString(), xp: currentXp.toString() },
			);

			setTimeout(() => { Cooldown.delete(userId); }, 60000);
		}
		else {
			await XpSchema.updateOne(
				{ guildId: message.guild.id, discordId: userId },
				{ xp: currentXp.toString() },
			);

			Cooldown.add(userId);
			setTimeout(() => { Cooldown.delete(userId); }, 60000);
		}
	},
};