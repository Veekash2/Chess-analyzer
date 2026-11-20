// What the bots say about things that happen on the board - your opening, a blunder,
// a great move, castling, a queen trade, promotion, thinking for ages, low time.
// Lines are fan-made banter written in each character's voice, not real quotes.
// {opening} is replaced with the opening's name.

export const DEFAULT_LINES = {
  opening: ['Ah, the {opening}.', 'The {opening} - good choice.', '{opening}. I know this one.'],
  myOpening: ['I like playing the {opening}.', 'The {opening} - one of my favourites.'],
  castle: ['Safe king. Smart.', 'Castled - good habit.'],
  userBlunder: ['Are you sure about that?', 'Hmm, I think you left something behind.', 'Oh! That might be a mistake.'],
  goodMove: ['Oh, nice move!', 'That was strong.', 'Hmm, I did not expect that.'],
  promote: ['A brand new queen!', 'Promotion!'],
  queenTrade: ['Queens are gone - now it is a different game.', 'No more queens. Let us see who plays the endgame better.'],
  idle: ['Take your time.', 'Still thinking?', 'No rush.'],
  lowTime: ['Watch your clock!', 'Your time is running low!'],
}

export const BOT_LINES = {
  pyaada: {
    opening: ['The {opening}? Is that a real thing?', 'Ooh, {opening}! My teacher said that name once.'],
    castle: ['Wait, the king can jump?!', 'How did your king and rook swap? Teach me!'],
    userBlunder: ['Is that piece free? Can I take it?', 'Hehe, I think you made an oopsie.'],
    goodMove: ['Whoa! How did you see that?', 'That was so cool!'],
    idle: ['Are you sleeping?', 'Hellooo? Your turn!'],
    queenTrade: ['Bye bye queens!'],
  },
  chhotu: {
    opening: ['{opening}? Sounds like a fancy shot - like a reverse sweep.'],
    castle: ['Castle! Like putting on pads before batting.'],
    userBlunder: ['Dropped catch! Thank you!', 'No-ball! Free hit for me!'],
    goodMove: ['Sixer! Great shot.', 'That was a googly - did not read it at all.'],
    idle: ['Bowler is waiting, yaar!', 'Over-rate penalty if you take this long!'],
    lowTime: ['Last over! Hurry hurry!'],
  },
  meera: {
    opening: ['The {opening}! We studied this in chess club.'],
    castle: ['Castling early - coach would be proud.'],
    userBlunder: ['Oh, I think you hung something!'],
    goodMove: ['Wow, I am writing that one in my notebook.'],
    promote: ['Promotion! My pawns dream of that.'],
  },
  ghoda: {
    opening: ['{opening}... fine, but where are the knight jumps?'],
    castle: ['Your king hides, but my knights can jump walls!'],
    userBlunder: ['Neigh-ce gift, thank you!', 'That square is perfect for a fork... hehe.'],
    goodMove: ['Good move. Even my horse is impressed.'],
    idle: ['My horse is getting restless...'],
  },
  dadi: {
    opening: ['{opening}. Your Dada used to play this, beta.'],
    castle: ['Good, beta. Keep the king safe, like keeping your shoes by the door.'],
    userBlunder: ['Arre beta, look again. Dadi will not take advantage... maybe.', 'Careful, beta, you left your piece alone.'],
    goodMove: ['Shabash! Very good move, beta.', 'So clever! Have a laddoo.'],
    idle: ['Take your time, beta. I will make more chai.', 'Thinking so hard? Drink some water.'],
    queenTrade: ['The queens are gone. Now it is like a quiet evening.'],
    lowTime: ['Beta, the clock! Quickly, quickly!'],
  },
  haathi: {
    castle: ['A fortress. I respect that.'],
    userBlunder: ['An elephant notices everything.'],
    goodMove: ['A strong step. Like an elephant crossing a river.'],
    idle: ['Slow is fine. Elephants are patient.'],
  },
  bunty: {
    opening: ['{opening}! Good brand, very popular in the market.'],
    userBlunder: ['Discount sale! Everything must go!', 'Free sample? I accept!'],
    goodMove: ['Ah, you know the value of things.'],
    queenTrade: ['Queen for queen - fair price!'],
    idle: ['Customer is thinking... I will wait.'],
  },
  priya: {
    castle: ['Castling will not save you from my attack!'],
    userBlunder: ['Thank you! Now the attack is unstoppable.'],
    goodMove: ['Okay, that was a good defensive move. Annoying.'],
    queenTrade: ['You traded queens? Scared of my attack?'],
  },
  mantri: {
    castle: ['The king hides in his palace. I will find him.'],
    userBlunder: ['A minister never forgives a mistake.'],
    goodMove: ['Clever. You would make a good minister.'],
  },
  iyer: {
    opening: ['The {opening}. Theory is just remembered logic.'],
    userBlunder: ['Let us call that... an experimental error.', 'Minus marks for that move.'],
    goodMove: ['Elegant. Full marks.', 'That follows logically. Well reasoned.'],
    idle: ['Show your working.', 'Calculation takes time. Good.'],
  },
  raja: {
    castle: ['A wise king retreats to his fortress.'],
    userBlunder: ['A careless subject. The king takes note.'],
    goodMove: ['A worthy move. The court approves.'],
  },
  rani: {
    castle: ['Hiding? A warrior faces her enemy.'],
    userBlunder: ['A gap in your armour. I will strike.'],
    goodMove: ['You fight like a warrior.'],
  },
  maharaja: {
    userBlunder: ['That will cost you.'],
    goodMove: ['Hm. You are better than I thought.'],
  },
  guru: {
    opening: ['The {opening}. Do you know why the moves are played, or only the moves?'],
    userBlunder: ['Breathe. Look at the whole board again next time.'],
    goodMove: ['Yes. You saw it.'],
    idle: ['Good. Think before you move. Always.'],
  },
  chaturanga: {
    userBlunder: ['...'], goodMove: ['...interesting.'],
  },

  // ---- streamers & celebrities
  kane: {
    hello: [
      "Alright! Took up chess after watching The Queen's Gambit - let's see what you've got.",
      'Just back from training. Quick game before dinner?',
      'Kimmich beat me on the team bus yesterday, so I need this one.',
    ],
    opening: ['The {opening} - proper textbook stuff, like a set piece we have drilled.', '{opening}, nice. I watched a video on that one.'],
    myOpening: ['I keep it simple - the {opening}. Like a tap-in at the back post.'],
    castle: ['Castled - keeping a clean sheet, are we?', 'Good. Get the defence organised first.'],
    userBlunder: [
      "That's a gift - like a back-pass straight to the striker.",
      "You've left that wide open. I don't miss those... usually.",
      'Oof. That is a penalty to me.',
    ],
    goodMove: [
      "Great move. That's a Kingsley Coman move - he's the best chess player in our dressing room.",
      "Didn't see that coming. Top bins.",
      'Lovely. That is a world-class pass.',
    ],
    check: ['Check! Straight down the middle.', 'Check - no keeper is stopping that.'],
    takes: ['Back of the net!', 'Clinical finishing.', 'Goal!'],
    lost: ['Should have tracked back there.', 'Fair tackle.', 'Ah, lost the ball in midfield.'],
    winning: ["We're 2-0 up. Just need to see it out.", 'Keep the ball, play it simple - we are winning this.'],
    losing: ['We are behind, but there is always time for a late winner.', 'Half-time team talk needed...'],
    queenTrade: ['Queens off. Time to grind it out like a 1-0 away win.'],
    promote: ['New queen! Like a late sub who scores.'],
    idle: ['Take your time - I take about this long over a penalty.', 'No rush. The ref has not blown the whistle yet.'],
    lowTime: ['Clock is running down - this is injury time!'],
    win: ['Three points! Off to the ice bath.', 'That is the win. Same again next week?'],
    loss: ['You were the better side today. Good game.', 'Gutted, but that is chess - and football. We go again.'],
    draw: ['A point away from home is never a bad result.'],
  },
  olise: {
    hello: ['Hey.', 'Let us play. I like to think a few moves ahead.'],
    opening: ['{opening}. I know this.', '{opening}. Okay.'],
    myOpening: ['The {opening}. Calm, solid.'],
    castle: ['Safe.', 'Good.'],
    userBlunder: ['I saw that coming three moves ago.', 'Hm. You left a gap.', 'That is space to run into.'],
    goodMove: ['Okay... that is a good one.', 'Nice. Did not expect that.'],
    check: ['Check.'], takes: ['Mine.', 'Saw it.'], lost: ['Okay.', 'Fair.'],
    queenTrade: ['Endgame. Fine by me.'],
    idle: ['Thinking is good.', '...'],
    lowTime: ['Clock.'],
  },
  botez: {
    hello: ['Hiii! Okay chat, let us do this.', 'Please, please do not let me Botez Gambit today.'],
    opening: ['Oh, the {opening}! Chat, I actually know this one.', '{opening}? Okay, spicy.'],
    myOpening: ['I am going for the {opening}. Wish me luck.'],
    castle: ['Castling, smart. Unlike me sometimes.', 'Okay, your king is tucked away, I see you.'],
    userBlunder: ['Wait... is that just free? Chat, is that free?', 'Oh, I think you blundered! Am I seeing this right?'],
    goodMove: ['Okay, that was really good. I am scared now.', 'Wow. Chat, did you see that move?'],
    queenTrade: ['Queens off - good, now I cannot hang mine!'],
    promote: ['A new queen! Please do not hang this one either.'],
    idle: ['Chat says you are taking forever.', 'Thinking hard? Same.'],
    lowTime: ['Oh no, the clock! Time scramble!'],
  },
  gotham: {
    hello: ['Welcome back to another... wait, I am the bot this time?', 'Alright, alright, alright. Let us play some chess.'],
    opening: ['Ah, the {opening}. I have made like twelve videos on this.', 'The {opening}! Great opening, I have a course on it. Kidding. Mostly.'],
    myOpening: ['The {opening}. You know I had to.', 'We are going for the {opening}, obviously.'],
    castle: ['Castles. The king goes into his little bunker.', 'Castled. Very responsible of you.'],
    userBlunder: ['Oh my god. You just hung that!', 'And they hang it! I cannot believe it.', 'That is a blunder, and I am going to take it.'],
    goodMove: ['Brilliant! Absolutely brilliant.', 'Oh, that is a great move. I respect it.', 'What a move. Somebody has been watching my videos.'],
    takes: ['And it is just free!', 'Takes. Of course.'],
    lost: ['The rook! ...wait, that was MY rook.', 'Okay, I did not see that.'],
    queenTrade: ['Queens are off the board, and it is a whole new game.'],
    promote: ['A brand new queen. Welcome to the party!'],
    idle: ['Are you still there? The audience is waiting.', 'Take your time. I will just make a thumbnail meanwhile.'],
    lowTime: ['Time scramble! This is where the chaos begins.'],
  },
  rosen: {
    hello: ['Hi everyone! Let us have a fun game.', 'Hello! Hopefully nothing tricky happens today...'],
    opening: ['The {opening}. A fine choice - though I may have a trick or two.'],
    myOpening: ['Ah, the {opening}. One of my favourites.', 'Let us try the {opening}. Just for fun, of course.'],
    castle: ['Castling. Very sensible.'],
    userBlunder: ['Oh, interesting... you might want to look at that again.', 'Hmm, I think that might just drop a piece.'],
    goodMove: ['Ooh, that is a really nice move.', 'Very nicely played!'],
    queenTrade: ['Queens off. Fewer tricks for me, sadly.'],
    idle: ['Take your time. Look for traps - there might be one.'],
    lowTime: ['Time is getting short!'],
  },
  magnus: {
    hello: ['Let us play.', 'Okay.'],
    opening: ['{opening}. I have played this a few times.', '{opening}. Fine.'],
    myOpening: ['{opening}. Why not.'],
    castle: ['Sure.'],
    userBlunder: ['That was a mistake.', 'Hm. That loses something.'],
    goodMove: ['Good move.', 'That is actually quite strong.'],
    queenTrade: ['Endgame. Good.', 'Queens off. I like this.'],
    idle: ['Take your time.'],
    lowTime: ['Not much time left.'],
  },
  hikaru: {
    hello: ['Let us go, chat. Speedrun.', 'Okay, I am just going to play fast.'],
    opening: ['They went {opening}, okay. Sure.', '{opening}. I have played this like ten thousand times.'],
    myOpening: ['{opening}. Standard.'],
    castle: ['Castles, sure.'],
    userBlunder: ['Chat, they just hung it.', 'That is just losing. Okay.', 'Oh, that is a blunder. Takes.'],
    goodMove: ['Oh, that is actually a really good move.', 'Wait, that is strong. Okay, okay.'],
    queenTrade: ['Queens off, whatever. Still winning.'],
    idle: ['Come on, move. This is taking forever.', 'Chat, they are thinking for so long.'],
    lowTime: ['I am just going to premove everything now.'],
  },
}

/** A line for `event` in this bot's voice, or null. */
export function lineFor(bot, event, vars = {}) {
  const list = bot.chat?.[event]?.length && !BOT_LINES[bot.id]?.[event] ? bot.chat[event]
    : BOT_LINES[bot.id]?.[event] || bot.chat?.[event] || DEFAULT_LINES[event]
  if (!list?.length) return null
  const s = list[Math.floor(Math.random() * list.length)]
  return s.replace(/\{(\w+)\}/g, (_, k) => vars[k] ?? '')
}
