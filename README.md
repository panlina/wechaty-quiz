# wechaty-quiz

A Wechaty plugin to play quiz game in a room.

## Usage

```js
var { Wechaty } = require('wechaty');
var WechatyQuizPlugin = require('wechaty-quiz');
var axios = require('axios');
var bot = new Wechaty();
bot.use(
	WechatyQuizPlugin({
		filter: [{ topic: "干饭群" }, { topic: /^都是老师/ }],
		fetch: () => axios.get("http://example.com/quiz").then(response => response.data),
		voteMin: 4,
		voteTimeout: 60 * 1000,
		answerTimeout: 60 * 1000
	})
);
```
