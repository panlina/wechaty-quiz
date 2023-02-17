/** @typedef { import("wechaty").Wechaty } Wechaty */
/** @typedef { import("wechaty").Contact } Contact */
/** @typedef { import("wechaty").Room } Room */
/** @typedef { import("wechaty").Message } Message */
var { MessageType } = require("wechaty-puppet");

/**
 * @param {Object} config
 * @param {() => Promise<{ question: string, answer: string }>} config.fetch quiz fetcher
 * @param {number} config.voteMin min vote to start the quiz
 * @param {number} config.voteTimeout vote timeout in milliseconds
 * @param {number} config.answerTimeout answer timeout in milliseconds
 */
module.exports = function WechatyQuizPlugin(config) {
	return function (/** @type {Wechaty} */bot) {
		bot.on("message", async (/** @type {Message} */message) => {
			if (message.talker().self()) {
				var match = message.text().match(/^quiz: (.*)/);
				if (match) {
					var [, roomTopic] = match;
					var room = await bot.Room.find({ topic: roomTopic });
					if (!room) {
						bot.userSelf().say(`Room ${roomTopic} not found`);
						return;
					}
					quiz(room);
				}
			}
		});
	};
	async function quiz(/** @type {Room} */room) {
		/** @type {Set<Contact["id"]>} */
		var vote = new Set();
		await room.say(`抢答比赛即将进行，回复\".\"报名，${config.voteTimeout / 1000}秒内报名人数>=${config.voteMin}时比赛开始。比赛奖励：红包5元。`);
		room.on('message', voteCounter);
		function voteCounter(/** @type {Message} */message) {
			if (message.text() == '.') {
				vote.add(message.talker().id);
				if (vote.size >= config.voteMin) {
					room.off('message', voteCounter);
					clearTimeout(timer);
					start();
				}
			}
		}
		var timer = setTimeout(async () => {
			room.off('message', voteCounter);
			await room.say("人数不足，我们下次比赛再见。");
		}, config.voteTimeout);
		async function start() {
			await room.say(`人数足够，即将开始比赛，请作好准备，抢答时间只有${config.answerTimeout / 1000}秒。`);
			setTimeout(async () => {
				var quiz = await config.fetch();
				await room.say(quiz.question);
				room.on('message', answerListener);
				var timer = setTimeout(async () => {
					room.off('message', answerListener);
					await room.say("时间到，没有人答对，本次比赛结束。");
					await room.say(`我们下次比赛再见。`);
				}, config.answerTimeout);
				async function answerListener(/** @type {Message} */message) {
					if (message.type() == MessageType.Unknown) return;
					if (message.text() == quiz.answer) {
						room.off('message', answerListener);
						clearTimeout(timer);
						await room.say("回答正确。");
						await room.say(`恭喜${message.talker().name()}赢得了本次比赛。`);
						await room.say(`我们下次比赛再见。`);
					} else
						await message.say("回答错误。");
				}
			}, 5 * 1000);
		}
	}
};
