process.chdir(__dirname);
var api = require('zenircbot-api');

var bot_config = api.load_config('../../bot.json');

var zen = new api.ZenIRCBot({host: bot_config.redis.host, port: bot_config.redis.port});
var sub = zen.get_redis_client();

// Subscribe to the "in" redis channel to receive standard messages
sub.subscribe('in');
sub.on('message', function(channel, message) {
  var msg = JSON.parse(message);
  var sender = msg.data.sender;
  // Only respond to standard "privmsg" messages (includes channel and private messages)
  if(msg.version == 1 && msg.type == "privmsg") {
    if(match=msg.data.message.match(/^[\/!]bid ([^@]+) (@.+)/i)) {
      // Match the proper '!bid' or '/bid' command
      console.log(match);

      var description = match[1].replace(/ with$/, '');
      var people = match[2].match(/@?[a-z]+/gi);

      console.log({
        description: description,
        people: people
      });

      zen.send_privmsg(msg.data.channel, match);

    } else if(match=msg.data.message.match(/^[\/!]bid [^@]+$/)) {
      // Catch some common errors, such as not mentioning people with an "@"
      zen.send_privmsg(msg.data.channel, 'Sorry I didn\'t get that. Try: !bid for buying groceries with @bee');
    }
  }
});
