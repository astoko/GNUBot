/* eslint-disable no-unused-vars */
const { EmbedBuilder, ButtonBuilder, ActionRowBuilder, ButtonStyle } = require('discord.js');
const DatabaseManager = require('./DatabaseManager');

class GiveawayManager {
	constructor() {
		this.giveaways = null;
		this.client = null;
		this.timeouts = new Map();
	}

	/**
     * Initialize the giveaway manager with client reference
     * @param {Client} client - Discord client instance
     */
	async initialize(client) {
		this.client = client;
		this.giveaways = DatabaseManager.collection('GiveawaySchema');
		await this.checkGiveaways();
	}

	/**
     * Clear all active timeouts
     */
	clearTimeouts() {
		for (const [messageId, timeout] of this.timeouts) {
			clearTimeout(timeout);
		}
		this.timeouts.clear();
	}


	/**
     * Create a new giveaway
     * @param {Object} params - Giveaway parameters
     * @param {string} params.channelId - Channel ID where giveaway is hosted
     * @param {string} params.guildId - Guild ID where giveaway is hosted
     * @param {string} params.prize - Giveaway prize
     * @param {number} params.winnerCount - Number of winners
     * @param {number} params.duration - Duration in milliseconds
     * @param {string} params.hosterId - User ID of giveaway host
     */
	async create(params) {
		const giveaway = {
			messageId: null,
			channelId: params.channelId,
			guildId: params.guildId,
			prize: params.prize,
			winnerCount: params.winnerCount,
			endTime: Date.now() + params.duration,
			hosterId: params.hosterId,
			participants: [],
			ended: false,
			winners: [],
		};

		const saved = await this.giveaways.insertOne(giveaway);
		return saved;
	}

	/**
     * End a giveaway
     * @param {string} messageId - Message ID of the giveaway
     */
	async end(messageId) {
		const giveaway = await this.giveaways.findOne({ messageId });
		if (!giveaway || giveaway.ended) return null;

		await this.giveaways.updateOne(
			{ messageId },
			{ $set: { ended: true } },
		);

		const winners = this.selectWinners(giveaway.participants, giveaway.winnerCount);
		await this.giveaways.updateOne(
			{ messageId },
			{ $set: { winners } },
		);

		if (this.timeouts.has(messageId)) {
			clearTimeout(this.timeouts.get(messageId));
			this.timeouts.delete(messageId);
		}

		try {
			const channel = await this.client?.channels.fetch(giveaway.channelId);
			if (!channel) return { ...giveaway, winners };

			const message = await channel.messages.fetch(messageId);
			if (!message) return { ...giveaway, winners };

			await message.edit({
				embeds: [this.createEmbed({ ...giveaway, winners }, true)],
				components: [this.createButtons(true)],
			});

			const winnerMentions = winners.map(id => `<@${id}>`).join(', ');
			await channel.send({
				content: winners.length ?
					`🎉 Congratulations ${winnerMentions}! You won **${giveaway.prize}**!` :
					'No valid winners for this giveaway!',
				allowedMentions: { users: winners },
			});

		}
		catch (error) {
			console.error('Error ending giveaway:', error);
		}

		return { ...giveaway, winners };
	}

	/**
     * Check and schedule all active giveaways
     */
	async checkGiveaways() {
		const activeGiveaways = await this.giveaways.find({ ended: false });
		for (const giveaway of activeGiveaways) {
			this.scheduleGiveaway(giveaway);
		}
	}

	/**
     * Schedule a giveaway to end
     * @param {Object} giveaway - Giveaway object
     */
	async scheduleGiveaway(giveaway) {
		if (!giveaway || !giveaway.messageId) return;

		if (this.timeouts.has(giveaway.messageId)) {
			clearTimeout(this.timeouts.get(giveaway.messageId));
			this.timeouts.delete(giveaway.messageId);
		}

		const timeLeft = giveaway.endTime - Date.now();
		const isEnded = typeof giveaway.ended === 'boolean' ? giveaway.ended :
			typeof giveaway.ended === 'string' ? giveaway.ended === 'true' || giveaway.ended === '1' :
				Boolean(giveaway.ended);

		if (!isEnded && timeLeft > 0) {
			const timeout = setTimeout(() => this.end(giveaway.messageId), timeLeft);
			this.timeouts.set(giveaway.messageId, timeout);
		}
		else if (timeLeft <= 0 && !isEnded) {
			await this.end(giveaway.messageId);
		}
	}

	selectWinners(participants, count) {
		const winners = [];
		participants = [...new Set(participants)];

		while (winners.length < count && participants.length > 0) {
			const index = Math.floor(Math.random() * participants.length);
			winners.push(participants.splice(index, 1)[0]);
		}

		return winners;
	}

	createEmbed(giveaway, ended = false) {
		const embed = new EmbedBuilder()
			.setTitle('🎉 Giveaway')
			.setDescription(`**Prize**: ${giveaway.prize}`)
			.addFields(
				{ name: 'Hosted by', value: `<@${giveaway.hosterId}>`, inline: true },
				{ name: 'Winners', value: giveaway.winnerCount.toString(), inline: true },
				{ name: 'Ends', value: ended ? 'Ended' : `<t:${Math.floor(giveaway.endTime / 1000)}:R>`, inline: true },
				{ name: 'Participants', value: giveaway.participants.length.toString(), inline: true },
			)
			.setColor(ended ? 'Red' : 'Green');

		if (ended && giveaway.winners.length > 0) {
			embed.addFields({
				name: 'Winners',
				value: giveaway.winners.map(id => `<@${id}>`).join(', '),
			});
		}

		return embed;
	}

	createButtons(ended = false) {
		return new ActionRowBuilder()
			.addComponents(
				new ButtonBuilder()
					.setCustomId('giveaway-join')
					.setLabel('Join Giveaway')
					.setEmoji('🎉')
					.setStyle(ButtonStyle.Primary)
					.setDisabled(ended),
			);
	}
}

module.exports = new GiveawayManager();