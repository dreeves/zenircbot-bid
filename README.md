Sealed Bidding
==============

A sealed bidding service for [ZenIRCBot](https://github.com/zenirc).


Usage Example
-------------

```
[in the main channel]
aaronpk: !bid for buying groceries @dreev @bee
Loqi: ok, I'll collect bids from them!
[the bot PMs each person with the following]
Loqi: aaronpk is requesting bids for buying groceries. Reply with "!bid 20"
aaronpk: !bid 20
Loqi: ok, your bid was accepted! When I've collected everyone's bids I will report back!
[then, in the main channel]
Loqi: Here are the results of the bids for buying groceries:
      @aaronpk 20, @dreev 16, @bee 8
```


Commands
--------

### Start a new bid

`!bid for buiying groceries with @dreev @bee`

Creates a new bid for buying groceries between the users mentioned as well as the user who created the bid. The bot will send a PM to each person mentioned prompting them to submit their bid.

If you start a new bid before the previous one is complete, the new one will overwrite the old one and delete everyone's pending bids.


### Submit a bid

`!bid 10`

If a bid is in progress, submits this value for the current open bid. If you submit a bid again before bidding is complete, your latest bid overrides the first one.

Bids are collected from anybody who replies while a bid is open, regardless of whether they were mentioned in the initial request. However, everybody mentioned must submit a bid before it is considered complete.

If no bid is in progress you will get a reply stating so.


### Check bidding progress

`!bid`

When a bid is in progress, the `!bid` command with no arguments will report back with the list of people who have already submitted bids.

