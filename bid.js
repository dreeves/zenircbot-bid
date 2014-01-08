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
  if(msg.version == 1 && msg.type == "privmsg") { // TODO: just return unless this is true
    if(match=msg.data.message.match(/^[\/!]bid (?:([^@]+) )?(@.+)/i)) { // TODO: just does it have an '@' at all

      console.log(sender+' > '+msg.data.channel+' :: '+msg.data.message);
      console.log("\t\t(starting a new auction)");

      var urtext = msg.data.message; // the original string used to initiate the auction
      var people = match[2].match(/@[a-z]\w*/gi); // great for hipchat with @-names assumed, not for irc
      // also add the initiator to the list of people
      if(people.indexOf('@'+sender.replace(/^@/, '')) == -1) {
        people.push('@'+sender.replace(/^@/, ''));
      }

      redis.set('current-bid', JSON.stringify({
        initiator: sender,
        channel: msg.data.channel,
        description: urtext,
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
              var message = 'Collecting bids for "' + urtext + '". Reply with "/bid YOUR_BID_HERE":';
              //if(sender.replace(/^@/,'') == person.replace(/^@/,'')) ... nah, don't bother distinguishing
              console.log('me > '+pmid+' :: '+message);
              zen.send_privmsg(pmid, message);
            } else {
              console.log('error finding pmid for nick: '+person);
            }
          })

        })(msg, sender, urtext, people, people[i]);
      }

      zen.send_privmsg(msg.data.channel, 'Ok, collecting bids from: ' + people.join(", "));

    } else if(match=msg.data.message.match(/^[\/!]bid ([^@]+)$/)) { // no '@' => it's an actual bid
      console.log(sender+' > '+msg.data.channel+' :: '+msg.data.message);
      console.log("\t\t(accepting a bid)");

      // Reject if no bid in progress
      redis.get('current-bid', function(err, current_bid){
        if(current_bid == null) {
          var message = 'Sorry, no auction in progress. Try: /bid for buying groceries with @bee';
          console.log('me > '+msg.data.channel+' :: '+message);
          zen.send_privmsg(msg.data.channel, message);
        } else {
          var bidstring = match[1];
          // Store this person's bid
          redis.hset('current-bid-values', sender.replace(/^@/,''), bidstring);

          var message = 'Got your bid as "' + bidstring + '". I\'ll report back when I\'ve collected everyone\'s.';
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
    } else if(msg.data.message.match(/^[\/!]bid$/)) { // a plain "/bid" reports on the status of the auction
      console.log(sender+' > '+msg.data.channel+' :: '+msg.data.message);

      redis.get('current-bid', function(err, current_bid){
        if(current_bid == null) {
          var message = 'There is no auction in progress.';
          console.log('me > '+msg.data.channel+' :: '+message);
          zen.send_privmsg(msg.data.channel, message);
        } else {
          redis.hgetall('current-bid-values', function(err, bid_data){
            var names = [];
            for(var name in bid_data) {
              names.push(name);
            }
            // TODO: say, like, still waiting on {people - names}, maybe with @-mentions
            var message = 'Collected bids from: '+names.join(', ');
            console.log('me > '+msg.data.channel+' :: '+message);
            zen.send_privmsg(msg.data.channel, message);
          });
        }
      });

    } else if(match=msg.data.message.match(/^[\/!]bid [^@]+$/)) { // TODO: i think this is never reached now
      console.log(sender+' > '+msg.data.channel+' :: '+msg.data.message);

      // Catch some common errors, such as not mentioning people with an "@"
      var message = 'Sorry I didn\'t get that. Try: /bid for buying groceries with @bee';
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
