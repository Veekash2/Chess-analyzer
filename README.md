# Singh Master Chess

A React web app that pulls every public game for a Chess.com username and turns it into stats, insights and engine-powered game reviews. Everything runs in the browser.

## Features

**Overview**
- Downloads a player's full game history from the public Chess.com API
- Ratings, win/draw/loss, results by colour and time control, most played openings and opponents
- Filter by time control and by the last 100 / 200 / 500 / 1,000 / 2,000 / custom number of games
- Download the games as PGN or JSON, or the statistics as a PDF

**Insights**
- Plain-English strengths and weaknesses worked out from the games
- Rating history, form strip and rolling score
- Results vs rating difference (compared with the Elo expectation), how games end, game length and phase
- Opening tree for White and Black
- Activity calendar and a day-of-week by hour heatmap
- Clock usage by move, time trouble and losses on time
- Heatmap of the squares your pieces move to
- Material swing by move, accuracy spread, castling, tilt and best games

**Game Review**
- Paste or upload a PGN, or pick one of the loaded games
- Analysed by Stockfish 17.1 (WebAssembly) on your own device
- Move labels: Brilliant, Great, Best, Excellent, Good, Book, Inaccuracy, Mistake, Miss and Blunder
- Accuracy per player, game-phase grades, key moments, an eval bar and an eval graph
- Coach explanations and best-move arrows
- Retry mode: replay your mistakes and try to find the better move

Accuracy and move labels are an approximation of Chess.com's Game Review. Chess.com doesn't publish its exact formula, so numbers can differ by a few points.

## Run it

```bash
npm install
npm run dev
```

Then open http://localhost:5173.

## Credits

- [Stockfish](https://stockfishchess.org/) 17.1 via the [`stockfish`](https://www.npmjs.com/package/stockfish) npm package (GPL-3.0)
- Opening names from [lichess-org/chess-openings](https://github.com/lichess-org/chess-openings) (CC0)
- [chess.js](https://github.com/jhlywa/chess.js) and [react-chessboard](https://github.com/Clariity/react-chessboard)
- Game data from the [Chess.com Published-Data API](https://www.chess.com/news/view/published-data-api)

This is an independent project and isn't affiliated with Chess.com.
