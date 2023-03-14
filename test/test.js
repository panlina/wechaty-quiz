/** @typedef { import("wechaty").Message } Message */
/** @typedef { import("wechaty").Contact } Contact */
/** @typedef { import("wechaty").Room } Room */

var assert = require('assert');
var { Wechaty, Message } = require('wechaty')
var { PuppetMock, mock: { Mocker }, mock } = require('wechaty-puppet-mock');
var WechatyQuizPlugin = require('..');

it('', async function() {
	this.timeout(10000);

	var mocker = new Mocker();

	var puppet = new PuppetMock({ mocker });
	var bot = new Wechaty({ puppet });
	bot.use(new WechatyQuizPlugin({
		fetch: () => Promise.resolve({ question: "a", answer: "b" }),
		voteMin: 2,
		voteTimeout: 5 * 1000,
		answerTimeout: 10 * 1000
	}));

	await bot.start();

	mocker.scan('https://github.com/wechaty', 1);
	var user = mocker.createContact();
	mocker.login(user);

	var contactA = mocker.createContact();
	var contactB = mocker.createContact();
	var room = mocker.createRoom({ memberIdList: [user.id, contactA.id, contactB.id] });

	contactA.say("抢答比赛").to(room);
	var message = await waitForMessage(room);
	assert.match(message.text(), /^抢答比赛即将进行/);

	contactA.say(".").to(room);
	await assert.rejects(waitForMessage(room));

	contactB.say(".").to(room);
	var message = await waitForMessage(room);
	assert.match(message.text(), /^人数足够，即将开始比赛/);

	await sleep(5000 - 50);
	var message = await waitForMessage(room);
	assert.equal(message.text(), "a");

	contactA.say("x").to(room);
	var message = await waitForMessage(room);
	assert.equal(message.text(), "回答错误。");

	contactB.say("b").to(room);
	var message = await waitForMessage(room);
	assert.equal(message.text(), "回答正确。");

	var message = await waitForMessage(room);
	assert.match(message.text(), /^恭喜/);
	var message = await waitForMessage(room);
	assert.equal(message.text(), "我们下次比赛再见。");

	await bot.stop();
});

it('filter', async function() {
	this.timeout(10000);

	var mocker = new Mocker();

	var puppet = new PuppetMock({ mocker });
	var bot = new Wechaty({ puppet });
	bot.use(new WechatyQuizPlugin({
		filter: [{ topic: /t/ }],
		fetch: () => Promise.resolve({ question: "a", answer: "b" }),
		voteMin: 2,
		voteTimeout: 5 * 1000,
		answerTimeout: 10 * 1000
	}));

	await bot.start();

	mocker.scan('https://github.com/wechaty', 1);
	var user = mocker.createContact();
	mocker.login(user);

	var contactA = mocker.createContact({ id: 'a' });
	var contactB = mocker.createContact({ id: 'b' });
	var roomA = mocker.createRoom({ topic: 't', memberIdList: [user.id, contactA.id, contactB.id] });
	var roomB = mocker.createRoom({ topic: 's', memberIdList: [user.id, contactA.id, contactB.id] });

	contactA.say("抢答比赛").to(roomA);
	var message = await waitForMessage(roomA);
	assert.match(message.text(), /^抢答比赛即将进行/);

	contactA.say("抢答比赛").to(roomB);
	await assert.rejects(waitForMessage(roomB));

	await bot.stop();
});

it('vote', async function() {
	this.timeout(10000);

	var mocker = new Mocker();

	var puppet = new PuppetMock({ mocker });
	var bot = new Wechaty({ puppet });
	bot.use(new WechatyQuizPlugin({
		fetch: () => Promise.resolve({ question: "a", answer: "b" }),
		voteMin: 2,
		voteTimeout: 5 * 1000,
		answerTimeout: 10 * 1000
	}));

	await bot.start();

	mocker.scan('https://github.com/wechaty', 1);
	var user = mocker.createContact();
	mocker.login(user);

	var contactA = mocker.createContact();
	var contactB = mocker.createContact();
	var room = mocker.createRoom({ memberIdList: [user.id, contactA.id, contactB.id] });

	contactA.say("抢答比赛").to(room);
	var message = await waitForMessage(room);
	assert.match(message.text(), /^抢答比赛即将进行/);

	contactA.say(".").to(room);
	await assert.rejects(waitForMessage(room));

	await sleep(5000 - 100 - 50);
	var message = await waitForMessage(room);
	assert.equal(message.text(), "人数不足，我们下次比赛再见。");

	await bot.stop();
});

/**
 * @param {Contact | Room} conversation
 * @return {Promise<Message>}
 */
function waitForMessage(conversation) {
	return require('promise-timeout').timeout(
		new Promise(resolve => {
			conversation.once('message', resolve);
		}),
		100
	);
}

/**
 * @param {number} time
 * @return {Promise<void>}
 */
function sleep(time) {
	return new Promise(resolve => {
		setTimeout(resolve, time);
	});
}
