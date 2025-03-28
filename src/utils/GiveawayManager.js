const { EmbedBuilder, ButtonBuilder, ActionRowBuilder, ButtonStyle } = require('discord.js');
const GiveawaySchema = require('../../Database/GiveawaySchema');

class GiveawayManager {
	constructor() {
		this.client = null;
		this.timeouts = new Map();
	}

	/**
     * Initialize the giveaway manager with client reference
     * @param {Client} client - Discord client instance
     */
	async initialize(client) {
		this.client = client;
		await this.checkGiveaways();
	}

	/**
     * Create a new giveaway
     * @param {Object} params Giveaway parameters
     * @returns {Promise<Document>} Created giveaway document
     */
	async create(params) {
		const giveaway = new GiveawaySchema({
			messageId: null,
			channelId: params.channelId,
			guildId: params.guildId,
			prize: params.prize,
			winnerCount: params.winnerCount,
			endTime: Date.now() + params.duration,
			hosterId: params.hosterId,
			participants: [],
			ended: false,
		});

		return await giveaway.save();
	}

	/**
     * End a giveaway
     * @param {string} messageId Giveaway message ID
     */
	async end(messageId) {
		const giveaway = await GiveawaySchema.findOne({
			messageId,
			ended: false,
		});

		if (!giveaway) return null;

		const winners = await this.selectWinners(giveaway.participants, giveaway.winnerCount, giveaway.guildId);
		const updatedGiveaway = await GiveawaySchema.findOneAndDelete(
			{ messageId, ended: false },
		);

		if (!updatedGiveaway) return null;

		this.clearTimeout(messageId);

		try {
			const channel = await this.client?.channels.fetch(giveaway.channelId);
			if (!channel) return updatedGiveaway;

			const message = await channel.messages.fetch(messageId);
			if (!message) return updatedGiveaway;

			await message.edit({
				embeds: [this.createEmbed(updatedGiveaway, true)],
				components: [this.createButtons(true)],
			});

			const winnerMentions = winners.map(id => `<@${id}>`).join(', ');
			await channel.send({
				content: giveaway.participants.length && winnerMentions.length ?
					`🎉 Congratulations ${winnerMentions}! You won **${giveaway.prize}**!` :
					'😞 No participants have joined, so no winners were chosen! (The participant(s) may have left the server)',
				allowedMentions: { users: winners },
			});
		}
		catch (error) {
			console.error('Error ending giveaway:', error);
		}

		return updatedGiveaway;
	}

	/**
     * Handle giveaway message deletion
     * @param {string} messageId Giveaway message ID
     */
	async end_messageDeleted(messageId) {
		const giveaway = await GiveawaySchema.findOneAndDelete({ messageId });
		if (!giveaway || giveaway.ended) return null;

		this.clearTimeout(messageId);

		try {
			const channel = await this.client?.channels.fetch(giveaway.channelId);
			if (channel) {
				await channel.send({
					content: '😞 The giveaway message was deleted!',
				});
			}
		}
		catch (error) {
			console.error('Error handling deleted giveaway:', error);
		}

		return giveaway;
	}

	/**
     * Check and schedule active giveaways
     */
	async checkGiveaways() {
		const activeGiveaways = await GiveawaySchema.find({
			ended: false,
			endTime: { $gt: Date.now() },
		});

		for (const giveaway of activeGiveaways) {
			await this.scheduleGiveaway(giveaway);
		}
	}

	/**
     * Clear a specific timeout
     * @param {string} messageId Message ID
     */
	clearTimeout(messageId) {
		if (this.timeouts.has(messageId)) {
			clearTimeout(this.timeouts.get(messageId));
			this.timeouts.delete(messageId);
		}
	}

	/**
     * Schedule a giveaway to end
     * @param {Document} giveaway Giveaway document
     */
	async scheduleGiveaway(giveaway) {
		if (!giveaway?.messageId) return;

		this.clearTimeout(giveaway.messageId);

		const timeLeft = giveaway.endTime - Date.now();

		if (!giveaway.ended && timeLeft > 0) {
			const timeout = setTimeout(
				() => this.end(giveaway.messageId),
				Math.min(timeLeft, 2147483647),
			);
			this.timeouts.set(giveaway.messageId, timeout);
		}
		else if (timeLeft <= 0 && !giveaway.ended) {
			await this.end(giveaway.messageId);
		}
	}

	async selectWinners(participants, count, guildId) {
		const winners = [];
		participants = [...new Set(participants)];

		while (winners.length < count && participants.length > 0) {
			const index = Math.floor(Math.random() * participants.length);
			const selectedId = participants.splice(index, 1)[0];

			try {
				const guild = await this.client.guilds.fetch(guildId);
				const member = await guild.members.fetch(selectedId);
				if (member) {
					winners.push(selectedId);
				}
			}
			catch {
				continue;
			}
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