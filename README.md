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

If a bid is already in progress for a channel, reply with:

`A bid is already in progress! Waiting for responses from: @dreev`

