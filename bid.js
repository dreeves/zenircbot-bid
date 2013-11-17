process.chdir(__dirname);
var api = require('zenircbot-api');

var bot_config = api.load_config('../../bot.json');

var zen = new api.ZenIRCBot({host: bot_config.redis.host, port: bot_config.redis.port});
var sub = zen.get_redis_client();
var redis = zen.get_redis_client();


// Subscribe to the "in" redis channel to receive standard messages
sub.subscribe('in');
sub.on('message', function(channel, message) {
  var msg = JSON.parse(message);
  var sender = msg.data.sender;
  // Only respond to standard "privmsg" messages (includes channel and private messages)
  if(msg.version == 1 && msg.type == "privmsg") {
    if(match=msg.data.message.match(/^[\/!]bid ([^@]+) (@.+)/i)) {

      console.log(sender+' > '+msg.data.channel+' :: '+msg.data.message);
      console.log("\t\t(starting a new bid)");

      // Match the proper '!bid' or '/bid' command
      //console.log(match);

      var description = match[1].replace(/ with$/, '');
      var people = match[2].match(/@?[a-z]+/gi);

      // also add the initiator to the list of people
      if(people.indexOf('@'+sender.replace(/^@/, '')) == -1) {
        people.push('@'+sender.replace(/^@/, ''));
      }

      redis.set('current-bid', JSON.stringify({
        initiator: sender,
        channel: msg.data.channel,
        description: description,
        people: people
      }));
      redis.del('current-bid-values');

      // console.log({
      //   description: description,
      //   people: people
      // });

      for(var i=0; i<people.length; i++) {
        (function(msg, sender, description, people, person){
          // Look up the ID to send a private message to each user
          pmid_for_nick(person, function(err, pmid){
            if(pmid) {
              var message;
              if(sender.replace(/^@/,'') == person.replace(/^@/,'')) {
                message = 'Tell me your bid by replying with "!bid 20"';
              } else {
                message = sender+' is requesting bids '+description+'. Reply with "!bid 20"';
              }
              console.log('me > '+pmid+' :: '+message);
              zen.send_privmsg(pmid, message);
            } else {
              console.log('error finding pmid for nick: '+person);
            }
          })

        })(msg, sender, description, people, people[i]);
      }

      zen.send_privmsg(msg.data.channel, 'Ok, I\'ll collect bids from them');

    } else if(match=msg.data.message.match(/^[\/!]bid ([0-9\.]+)$/)) {
      console.log(sender+' > '+msg.data.channel+' :: '+msg.data.message);
      console.log("\t\t(accepting a bid)");

      // Reject if no bid in progress
      redis.get('current-bid', function(err, current_bid){
        if(current_bid == null) {
          var message = 'Sorry, there is no bid in progress. Try: !bid for buying groceries with @bee';
          console.log('me > '+msg.data.channel+' :: '+message);
          zen.send_privmsg(msg.data.channel, message);
        } else {
          // Store this person's bid
          redis.hset('current-bid-values', sender.replace(/^@/,''), match[1]);

          var message = 'Got it! I\'ll report back when I\'ve collected everyone\'s bids.';
          console.log('me > '+msg.data.channel+' :: '+message);
          zen.send_privmsg(msg.data.channel, message);

          // Check if we have collected all the bids
          (function(current_bid){
            redis.hgetall('current-bid-values', function(err, bid_data){
              // console.log("Current bid:", current_bid);
              // console.log("Bid data:", bid_data);

              var complete = true;
              for(var i=0; i<current_bid.people.length; i++) {
                if(bid_data[current_bid.people[i].replace(/^@/,'')] == null) {
                  complete = false;
                }
              }
              // console.log("Bid complete? " + (complete ? "y" : "n"));

              if(complete) {
                // Output all bids back to the main channel
                var bid_strings = [];
                for(var i=0; i<current_bid.people.length; i++) {
                  bid_strings.push(current_bid.people[i] + ": " + bid_data[current_bid.people[i].replace(/^@/,'')]);
                }
                var message = "Bidding complete! Here are the bids: "+bid_strings.join(', ');
                console.log('me > '+current_bid.channel+' :: '+message);
                zen.send_privmsg(current_bid.channel, message);
                redis.del('current-bid');
                redis.del('current-bid-values');
              }

            });
          })(JSON.parse(current_bid));
        }
      });
    } else if(msg.data.message.match(/^[\/!]bid$/)) {

      redis.get('current-bid', function(err, current_bid){
        if(current_bid == null) {
          var message = 'There is no bid in progress.';
          console.log('me > '+msg.data.channel+' :: '+message);
          zen.send_privmsg(msg.data.channel, message);
        } else {
          redis.hgetall('current-bid-values', function(err, bid_data){
            var names = [];
            for(var name in bid_data) {
              names.push(name);
            }
            var message = 'So far I have collected bids from: '+names.join(', ');
            console.log('me > '+msg.data.channel+' :: '+message);
            zen.send_privmsg(msg.data.channel, message);
          });
        }
      });

    } else if(match=msg.data.message.match(/^[\/!]bid [^@]+$/)) {
      // Catch some common errors, such as not mentioning people with an "@"
      var message = 'Sorry I didn\'t get that. Try: !bid for buying groceries with @bee';
      console.log('me > '+msg.data.channel+' :: '+message);
      zen.send_privmsg(msg.data.channel, message);
    }
  }
});

// This is hard-coded for Hipchat now, need to figure out how to make this work better for IRC too
function pmid_for_nick(nick, callback) {
  redis.get('zenircbot:nick:'+nick.replace(/^@/,''), function(err, response){
  	  var data = JSON.parse(response);
	  if(err || data == null){
		  callback(err, null);
	  } else {
		  callback(null, data.jid);
	  }
  });
}
