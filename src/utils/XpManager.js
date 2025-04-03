/* eslint-disable no-empty-function */
/* eslint-disable no-unused-vars */
const { createCanvas, loadImage, GlobalFonts } = require('@napi-rs/canvas');
const { presenceImgStatus, badgesImg, botBadgesImg, otherImages } = require('../../config/image-files.json');

class LevelUpImage {
	constructor() {
		this.font = {
			extraLight: {
				name: 'ReadexPro-ExtraLight',
				path: './assets/fonts/ReadexPro/ReadexPro-ExtraLight.ttf',
			},
			semiBold: {
				name: 'ReadexPro-SemiBold',
				path: './assets/fonts/ReadexPro/ReadexPro-SemiBold.ttf',
			},
		};
		this.background = {
			type: 'image',
			background: './assets/images/lvlup.png',
		};
		this.title = {
			data: 'You leveled up!',
			color: '#FFFFFF',
			size: 34,
		};
		this.levels = {
			oldLevel: 0,
			newLevel: 1,
		};
	}

	/**
     * @param {string} type - image or color
     * @param {string|Buffer|Image} value - URL or hexcolor
     * @returns {LevelUp} - Returns this, or LevelUp
     * @example setBackground("image", URL)
     * @example setBackground("color", "#000")
     */
	setBackground(type, value) {
		if (type === 'color') {
			if (value) {
				if (/^#([a-fA-F0-9]{6}|[a-fA-F0-9]{3})$/.test(value)) {
					this.background.type = 'color';
					this.background.background = value;
					return this;
				}
				else {
					throw new Error('Invalid color for the arg in setBackground method. Hexadecimal color is only accepted.');
				}
			}
			else {
				throw new Error('You must give a hexadecimal color as a second arg of setBackground method.');
			}
		}
		else if (type === 'image') {
			if (value) {
				this.background.type = 'image';
				this.background.background = value;
				return this;
			}
			else {
				throw new Error('You must give a url or a local file as a second arg of setBackground method.');
			}
		}
		else {
			throw new Error('The first arg of setBackground method must be \'image\' or \'color\'.');
		}
	}

	/**
     * @param {number} oldLevel - Old Level number
     * @param {number} newLevel - New Level number
     * @returns {LevelUp} - Returns this, or LevelUp
     * @example setLevels(0, 1)
     */
	setLevels(oldLevel, newLevel) {
		if (typeof oldLevel === 'string') oldLevel = parseInt(oldLevel);
		if (typeof newLevel === 'string') newLevel = parseInt(newLevel);
		if (isNaN(oldLevel)) {
			throw new Error('The first arg of setLevels method is not a valid number.');
		}
		if (isNaN(newLevel)) {
			throw new Error('The second arg of setLevels method is not a valid number.');
		}

		this.levels.oldLevel = oldLevel;
		this.levels.newLevel = newLevel;
		return this;
	}

	/**
     * Builds image
     */
	async build() {
		const canvas = createCanvas(1000, 300);
		const context = canvas.getContext('2d');
		const abbreviateNumber = (value) => {
			let newValue = value;

			if (value >= 1000) {
				const suffixes = ['', 'K', 'M', 'B', 'T', 'Qd'];
				const suffixNum = Math.floor(('' + value).length / 3);
				let shortValue = '';

				for (let precision = 2; precision >= 1; precision--) {
					shortValue = parseFloat((suffixNum != 0 ? (value / Math.pow(1000, suffixNum)) : value).toPrecision(precision));

					const dotLessShortValue = (shortValue + '').replace(/[^a-zA-z 0-9]+/g, '');

					if (dotLessShortValue.length <= 2) { break; }
				}

				if (shortValue % 1 != 0) shortValue = shortValue.toFixed(1);
				newValue = shortValue + suffixes[suffixNum];
			}

			return newValue;
		};

		GlobalFonts.registerFromPath(this.font.extraLight.path, this.font.extraLight.name);
		GlobalFonts.registerFromPath(this.font.semiBold.path, this.font.semiBold.name);

		context.beginPath();
		context.moveTo(80, 30);
		context.lineTo(canvas.width - 80, 30);
		context.quadraticCurveTo(canvas.width - 30, 30, canvas.width - 30, 80);
		context.lineTo(canvas.width - 30, canvas.height - 80);
		context.quadraticCurveTo(canvas.width - 30, canvas.height - 30, canvas.width - 80, canvas.height - 30);
		context.lineTo(80, canvas.height - 30);
		context.quadraticCurveTo(30, canvas.height - 30, 30, canvas.height - 80);
		context.lineTo(30, 80);
		context.quadraticCurveTo(30, 30, 80, 30);
		context.closePath();
		context.clip();

		if (this.background.type === 'color') {
			context.beginPath();
			context.fillStyle = this.background.background;
			context.fillRect(0, 0, canvas.width, canvas.height);
		}
		else if (this.background.type === 'image') {
			try {
				const bgImage = await loadImage(this.background.background);
				const bgRatio = bgImage.width / bgImage.height;
				const canvasRatio = canvas.width / canvas.height;
				let drawWidth = canvas.width;
				let drawHeight = canvas.height;
				let offsetX = 0;
				let offsetY = 0;

				if (bgRatio > canvasRatio) {
					drawWidth = canvas.height * bgRatio;
					offsetX = (canvas.width - drawWidth) / 2;
				}
				else {
					drawHeight = canvas.width / bgRatio;
					offsetY = (canvas.height - drawHeight) / 2;
				}

				context.filter = 'blur(2px)';
				context.drawImage(bgImage, offsetX, offsetY, drawWidth, drawHeight);
				context.filter = 'none';
			}
			catch {
				throw new Error('The image given in the second params of setBackground method is not valid or you are not connected to the internet');
			}
		}

		context.font = `${this.title.size * 2}px ${this.font.semiBold.name}`;
		context.fillStyle = this.title.color;
		context.textAlign = 'center';
		context.fillText(this.title.data, canvas.width / 2, 140);

		context.font = `${40}px ${this.font.extraLight.name}`;
		context.fillStyle = this.title.color;
		context.fillText(
			`${abbreviateNumber(this.levels.oldLevel)} -> ${abbreviateNumber(this.levels.newLevel)}`,
			canvas.width / 2,
			210,
		);

		return canvas.toBuffer('image/png');
	}
}

class TopLeaderboardImage {
	constructor() {
		this.font = {
			extraLight: {
				name: 'ReadexPro-ExtraLight',
				path: './assets/fonts/ReadexPro/ReadexPro-ExtraLight.ttf',
			},
			semiBold: {
				name: 'ReadexPro-SemiBold',
				path: './assets/fonts/ReadexPro/ReadexPro-SemiBold.ttf',
			},
		};
		this.background = {
			type: 'image',
			background: './assets/images/lvlup.png',
		};
		this.usersData = [{ top: 1, avatar: 'https://cdn.discordapp.com/embed/avatars/0.png', tag: 'user1', level: 1 }];
		this.opacity = 0;
		this.abbreviateNumber = true;
		this.levelMessage = '';
		this.colors = { box: '#212121', username: '#FFFFFF', level: '#FFFFFF', firstRank: '#f7c716', secondRank: '#9e9e9e', thirdRank: '#94610f' };
	}

	/**
	 * @param {Array|Object} usersData - [{ top: int, avatar: string, tag: string, level: int }]
	 * @returns {TopLeaderboardImage} - Returns this, or TopLeaderboard
	 * @example setUsersData([{ top: 1, avatar: 'https://cdn.discordapp.com/embed/avatars/0.png', tag: 'user1', level: 1 }])
	 */
	setUsersData(usersData) {
		if (usersData.length > 10) {
			throw new Error('setUsersData values cannot be greater than 10.');
		}

		this.usersData = usersData;
		return this;
	}

	/**
	 * @param {string} message - Set custom level msg
	 * @returns {TopLeaderboardImage} - Return this, or TopLeaderboard
	 * @example setLevelMessage('Level')
	 */
	setLevelMessage(message) {
		this.levelMessage = message;
		return this;
	}

	/**
	 * @param {object} colors - { box: hexcolor, username: hexcolor, level: hexcolor, firstRank: hexcolor, secondRank: hexcolor, thirdRank: hexcolor }
	 * @returns {TopLeaderboardImage} - Returns this, or TopLeaderboard
	 * @example setColors({ box: '#212121', username: '#FFFFFF', level: '#FFFFFF', firstRank: '#f7c716', secondRank: '#9e9e9e', thirdRank: '#94610f' })
	 */
	setColors(colors) {
		this.colors = colors;
		return this;
	}

	/**
	 * @param {boolean} bool - True or False
	 * @returns {TopLeaderboardImage} - Returns this, or TopLeaderboard
	 * @example setAbbreviateNumber(true)
	 */
	setAbbreviateNumber(bool) {
		if (typeof bool !== 'boolean') {
			throw new Error('The arg of setAbbreviateNumber method must be a boolean.');
		}

		this.abbreviateNumber = bool;
		return this;
	}

	/**
	 * @param {number} opacity - Must be between 0 and 1
	 * @returns {TopLeaderboardImage} - Returns this, or TopLeaderboard
	 * @example setOpacity(0.5)
	 */
	setOpacity(opacity = 0) {
		if (opacity) {
			if (opacity >= 0 && opacity <= 1) {
				this.opacity = opacity;
				return this;
			}
			else {
				throw new Error('The arg of setOpacity method must be between 0 and 1.');
			}
		}
	}

	/**
	 * @param {string} type - image or color
	 * @param {string} value - URL or hexcolor
	 * @returns {TopLeaderboardImage} - Returns this, or TopLeaderboard
	 * @example setBackground('image', URL)
	 * @example setBackground('color', '#000')
	 */
	setBackground(type, value) {
		if (type === 'color') {
			if (value) {
				if (/^#([a-fA-F0-9]{6}|[a-fA-F0-9]{3})$/.test(value)) {
					this.background.type = 'color';
					this.background.background = value;
					return this;
				}
				else {
					throw new Error('Invalid color for the arg in setBackground method. Hexadecimal color is only accepted.');
				}
			}
			else {
				throw new Error('You must give a hexadecimal color as a second arg of setBackground method.');
			}
		}
		else if (type === 'image') {
			if (value) {
				this.background.type = 'image';
				this.background.background = value;
				return this;
			}
			else {
				throw new Error('You must give a url or a local file as a second arg of setBackground method.');
			}
		}
		else {
			throw new Error('The first arg of setBackground method must be a image or color.');
		}
	}

	/**
     * Builds image
     */
	async build() {
		const fillRoundRect = (context, x, y, w, h, r, f, s) => {
			if (typeof r === 'number') {
				r = { tl:r, tr:r, br:r, bl:r };
			}
			else {
				const defaults = { tl:0, tr:0, br:0, bl:0 };

				for (const side in defaults) {
					r[side] = r[side] || defaults[side];
				}
			}

			context.beginPath();
			context.moveTo(x + r.tl, y);
			context.lineTo(x + w - r.tr, y);
			context.quadraticCurveTo(x + w, y, x + w, y + r.tr);
			context.lineTo(x + w, y + h - r.br);
			context.quadraticCurveTo(x + w, y + h, x + w - r.br, y + h);
			context.lineTo(x + r.bl, y + h);
			context.quadraticCurveTo(x, y + h, x, y + h - r.bl);
			context.lineTo(x, y + r.tl);
			context.quadraticCurveTo(x, y, x + r.tl, y);
			context.closePath();

			if (f) {
				context.fill();
			}
			if (s) {
				context.stroke();
			}
		};
		const abbreviateNumber = (value) => {
			let newValue = value;

			if (value >= 1000) {
				const suffixes = ['', 'K', 'M', 'B', 'T', 'Qd'];
				const suffixNum = Math.floor(('' + value).length / 3);
				let shortValue = '';

				for (let precision = 2; precision >= 1; precision--) {
					shortValue = parseFloat((suffixNum != 0 ? (value / Math.pow(1000, suffixNum)) : value).toPrecision(precision));

					const dotLessShortValue = (shortValue + '').replace(/[^a-zA-z 0-9]+/g, '');

					if (dotLessShortValue.length <= 2) { break; }
				}

				if (shortValue % 1 != 0) shortValue = shortValue.toFixed(1);
				newValue = shortValue + suffixes[suffixNum];
			}

			return newValue;
		};

		const padding = 50;
		const entryHeight = 90;
		const avatarSize = 70;
		const totalUsers = this.usersData?.length || 0;
		const spacing = 30;
		const contentHeight = totalUsers * entryHeight + (totalUsers - 1) * spacing + padding * 2;
		const canvasHeight = Math.max(300, contentHeight);
		const canvas = createCanvas(1000, canvasHeight);
		const context = canvas.getContext('2d');

		GlobalFonts.registerFromPath(this.font.extraLight.path, this.font.extraLight.name);
		GlobalFonts.registerFromPath(this.font.semiBold.path, this.font.semiBold.name);

		context.beginPath();
		context.moveTo(80, 30);
		context.lineTo(canvas.width - 80, 30);
		context.quadraticCurveTo(canvas.width - 30, 30, canvas.width - 30, 80);
		context.lineTo(canvas.width - 30, canvas.height - 80);
		context.quadraticCurveTo(canvas.width - 30, canvas.height - 30, canvas.width - 80, canvas.height - 30);
		context.lineTo(80, canvas.height - 30);
		context.quadraticCurveTo(30, canvas.height - 30, 30, canvas.height - 80);
		context.lineTo(30, 80);
		context.quadraticCurveTo(30, 30, 80, 30);
		context.closePath();
		context.clip();

		context.beginPath();
		context.moveTo(65, 25);
		context.lineTo(canvas.width - 65, 25);
		context.quadraticCurveTo(canvas.width - 25, 25, canvas.width - 25, 65);
		context.lineTo(canvas.width - 25, canvas.height - 65);
		context.quadraticCurveTo(canvas.width - 25, canvas.height - 25, canvas.width - 65, canvas.height - 25);
		context.lineTo(65, canvas.height - 25);
		context.quadraticCurveTo(25, canvas.height - 25, 25, canvas.height - 65);
		context.lineTo(25, 65);
		context.quadraticCurveTo(25, 25, 65, 25);
		context.closePath();
		context.clip();

		context.globalAlpha = 1;
		if (this.background.type === 'color') {
			context.fillStyle = this.background.background;
			context.fillRect(0, 0, canvas.width, canvas.height);
		}
		else if (this.background.type === 'image') {
			try {
				const bgImage = await loadImage(this.background.background);

				const ratio = bgImage.width / bgImage.height;
				const canvasRatio = canvas.width / canvas.height;

				let drawWidth = canvas.width;
				let drawHeight = canvas.height;
				let offsetX = 0;
				let offsetY = 0;

				if (ratio > canvasRatio) {
					drawWidth = canvas.height * ratio;
					offsetX = (canvas.width - drawWidth) / 2;
				}
				else {
					drawHeight = canvas.width / ratio;
					offsetY = (canvas.height - drawHeight) / 2;
				}

				context.filter = 'blur(2px)';
				context.drawImage(bgImage, offsetX, offsetY, drawWidth, drawHeight);
				context.filter = 'none';
			}
			catch {
				throw new Error('Invalid background image or network issue');
			}
		}

		if (this.usersData && totalUsers > 0) {
			for (let i = 0; i < totalUsers; i++) {
				context.save();

				const boxY = totalUsers === 1
					? Math.floor((canvas.height - entryHeight) / 2)
					: padding + i * (entryHeight + spacing);

				context.fillStyle = this.colors.box;
				context.globalAlpha = this.opacity;
				fillRoundRect(context, padding, boxY, canvas.width - padding * 2, entryHeight, 20, true, false);
				context.globalAlpha = 1;

				context.save();
				const avatarY = boxY + (entryHeight - avatarSize) / 2;
				const avatarX = padding + 10;

				context.beginPath();
				context.arc(
					avatarX + avatarSize / 2,
					avatarY + avatarSize / 2,
					avatarSize / 2, 0, Math.PI * 2, true,
				);
				context.closePath();
				context.clip();

				const avatar = await loadImage(this.usersData[i].avatar);
				context.drawImage(avatar, avatarX, avatarY, avatarSize, avatarSize);
				context.restore();

				const textY = boxY + entryHeight / 2 + 10;

				context.font = `27px ${this.font.semiBold.name}`;
				context.fillStyle = this.colors.username;
				context.textAlign = 'left';
				context.fillText(
					this.usersData[i].tag,
					padding + 10 + avatarSize + 30,
					textY,
					380,
				);

				context.font = `27px ${this.font.extraLight.name}`;
				context.fillStyle = this.colors.level;
				context.textAlign = 'right';
				const level = this.abbreviateNumber
					? abbreviateNumber(this.usersData[i].level)
					: this.usersData[i].level;
				context.fillText(
					`${this.levelMessage} ${level}`,
					canvas.width - padding - 150,
					textY,
					200,
				);

				context.font = `40px ${this.font.extraLight.name}`;
				const rank = this.usersData[i].top;

				if (rank === 1) context.fillStyle = this.colors.firstRank;
				else if (rank === 2) context.fillStyle = this.colors.secondRank;
				else if (rank === 3) context.fillStyle = this.colors.thirdRank;
				else context.fillStyle = this.colors.level;

				context.textAlign = 'right';
				context.fillText(
					`#${rank}`,
					canvas.width - padding - 20,
					textY,
					50,
				);

				context.restore();
			}
		}
		else {
			context.font = `40px ${this.font.extraLight.name}`;
			context.fillStyle = '#FFFFFF';
			context.textAlign = 'center';
			context.shadowBlur = 10;
			context.shadowOffsetX = 8;
			context.shadowOffsetY = 6;
			context.shadowColor = '#0a0a0a';
			context.fillText('Not found', canvas.width / 2, canvas.height / 2, 500);
		}

		return canvas.toBuffer('image/png');
	}
}

module.exports = { LevelUpImage, TopLeaderboardImage };