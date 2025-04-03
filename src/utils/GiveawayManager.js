const { EmbedBuilder, ButtonBuilder, ActionRowBuilder, ButtonStyle } = require('discord.js');
const GiveawaySchema = require('../../database/GiveawaySchema');

class GiveawayManager {
	constructor() {
		this.client = null;
		this.timeouts = new Map();
	}

	/**
     * Initialize the giveaway manager with client reference
     * @param {Client} client - Discord client instance
	 * @example initialize(client)
     */
	async initialize(client) {
		this.client = client;
		await this.checkGiveaways();
	}

	/**
     * Clear a specific timeout
     * @param {string} messageId Message ID
	 * @example clearTimeout(messageId)
     */
	clearTimeout(messageId) {
		if (this.timeouts.has(messageId)) {
			clearTimeout(this.timeouts.get(messageId));
			this.timeouts.delete(messageId);
		}
	}

	/**
     * Check and schedule active giveaways
	 * @example checkGiveaways()
     */
	async checkGiveaways() {
		const activeGiveaways = await GiveawaySchema.find({
			ended: false,
		});

		for (const giveaway of activeGiveaways) {
			if (giveaway.endTime <= Date.now()) {
				await this.end(giveaway.messageId);
			}
			else {
				await this.scheduleGiveaway(giveaway);
			}
		}
	}

	/**
     * Create a new giveaway
     * @param {Object} params Giveaway parameters
     * @returns {Promise<Document>} Created giveaway document
	 * @example create(params)
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
	 * @example end(messageId)
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
	 * @example end_,messageDeleted(messageId)
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
     * Schedule a giveaway to end
     * @param {Document} giveaway Giveaway document
	 * @example scheduleGiveaway(giveaway)
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

	/**
 	 * Select winners for a giveaway
 	 * @param {string[]} participants - Array of participant user IDs
 	 * @param {number} count - Number of winners to select
 	 * @param {string} guildId - Discord guild/server ID
 	 * @returns {Promise<string[]>} Array of winner user IDs
	 * @example selectWinners(participants, count, guildId)
 	*/
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

	/**
 	 * Create giveaway embed
 	 * @param {Object} giveaway - Giveaway document from database
 	 * @param {string} giveaway.prize - The giveaway prize
 	 * @param {string} giveaway.hosterId - User ID of giveaway host
 	 * @param {number} giveaway.winnerCount - Number of winners
 	 * @param {number} giveaway.endTime - Timestamp when giveaway ends
 	 * @param {string[]} giveaway.participants - Array of participant user IDs
 	 * @param {string[]} [giveaway.winners] - Array of winner user IDs
 	 * @param {boolean} ended - Whether the giveaway has ended
 	 * @returns {EmbedBuilder} Discord embed for the giveaway
	 * @example createEmbed(giveaway, ended)
 	*/
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

	/**
 	 * Create giveaway buttons
 	 * @param {boolean} ended - Whether the giveaway has ended
 	 * @returns {ActionRowBuilder} Discord button row for the giveaway
	 * @example createButtons(ended)
 	*/
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