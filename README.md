# Random Chess

Random Chess is a card-driven twist on classic chess. Each turn you draw a card that constrains your legal move, creating sharp tactical puzzles, surprising tempo swings, and a fresh kind of planning.

## Highlights

- Card-constrained chess that stays faithful to core rules while adding fresh strategy.
- Multiple play modes: online with friends, single-player, and Stockfish-powered computer games.
- Match timers, shareable game links, and in-game chat for live sessions.
- History views and mate practice for quick training.
- Built with React + Vite, chess.js rules enforcement, and react-intl localization.

## Getting started

### Install

```bash
npm install
```

### Run locally

```bash
npm run dev
```

### Build for production

```bash
npm run build
```

### Preview the production build

```bash
npm run preview
```

### Run tests

```bash
npm test
```

## Firebase setup

### 1) Create Firebase project and web app

- Create a Firebase project and register a Web App.
- Copy the config values into `.env` (see `.env.example`).

### 2) Enable Authentication

The app uses:

- Anonymous auth (guest play)
- Email/password auth
- Google sign-in

Enable these providers in Firebase Authentication.

### 3) Enable Firestore

- Create a Firestore database.
- Apply security rules from `firebaseRules.txt`.
- Create collections:
  - `games`
  - `gameData`
  - `gameMoves`
  - `players`
  - `chats`

### 4) (Optional) App Check

If you want App Check, enable reCAPTCHA Enterprise and set `VITE_APP_CHECK_SITE_KEY` (and optionally `VITE_APP_CHECK_DEBUG_TOKEN` for local dev).

## Firestore data model

Collections and document shapes created by the app:

- `games/{gameId}`

  - `white`: string | null (uid)
  - `black`: string | null (uid)
  - `participants`: string[] (uids)
  - `whiteName`: string | null
  - `blackName`: string | null
  - `createdAt`: timestamp
  - `expiresAt`: timestamp (TTL)

- `gameData/{gameId}`

  - `status`: "waiting" | "playing" | "finished"
  - `whiteArrived`: boolean
  - `blackArrived`: boolean
  - `firstCard`: string | number
  - `gameId`: string (must match doc id)
  - `timeLimitMs`: number
  - `whiteTimeLeftMs`: number
  - `blackTimeLeftMs`: number
  - `lastMoveAt`: timestamp
  - `expiresAt`: timestamp (TTL)
  - `whiteLastActiveAt`: timestamp
  - `blackLastActiveAt`: timestamp
  - `winner`: "w" | "b" | null
  - `resultReason`: "timeout" | "resign" | "agreement" | "stalemate" | "checkmate" | "insufficient" | "other"
  - `drawOffer`: { by: "w" | "b" }
  - `unreadByUid`: map of uid -> number (unread chat messages)

- `gameMoves/{gameId}`

  - `moves`: array of chess.js move objects
  - `fen`: string
  - `pgn`: string
  - `gameId`: string (must match doc id)
  - `createdAt`: timestamp
  - `expiresAt`: timestamp (TTL)

- `chats/{gameId}`

  - `gameId`: string (must match doc id)
  - `messages`: array of
    - `createdAt`: timestamp
    - `text`: string
    - `msgId`: string
    - `author`: { uid, displayName, photoURL, isAnonymous }
  - `createdAt`: timestamp
  - `expiresAt`: timestamp (TTL)
  - Note: chat messages are loaded on-demand when the chat panel is opened.

- `players/{uid}`
  - `uid`: string
  - `displayName`: string | null
  - `photoURL`: string | null
  - `isAnonymous`: boolean

## Deployment

### Configure base path

This app supports running from root or a subfolder. Set the base path via env:

```
VITE_BASE=/chess/
```

When running from root, set:

```
VITE_BASE=/
```

### Build and host

```bash
npm run build
```

Deploy the `dist/` folder to any static host (Firebase Hosting, Netlify, Vercel, Nginx, Apache).

If you host under `/chess/` on Apache, use the provided `/.htaccess` as a starting point (updates the rewrite base to `/chess/`).

## Game rules

- Classic chess pieces and board.
- Each turn you draw a card; your move must be legal in chess and satisfy that card.
- If no legal move fits the card, a new card is drawn.

### Cards in the deck and what they mean

- 1-8: Move must start or end on that rank. Example: card 7 -> play Rd7 or d7-d5.
- a-h: Move must start or end on that file. Example: card e -> play Re1 or e4xd5.
- R, N, B, Q, K: Move must involve that piece (moving, capturing, or promoting to it for Q/B/R/N). Example: card R -> e7-e8=R or Ra1-a8.
- p: Any pawn move (including captures and promotions). Example: card p -> e2-e4 or exd5.
- take: The move must capture a piece. Example: card take -> Qxd7+.
- check: The move must give check or checkmate. Example: card check -> Qh5+.
- stalemate: Move must result in a stalemate position. Example: card stalemate -> force no legal moves without check.
- any: Any legal chess move. Example: card any -> any legal move.
- Castling squares: Castling allowed if the card matches a castling square (a/b/c/d/e for long, e/f/g/h for short, plus rank 1/8 for your color). Example: card a or d with 1 -> O-O-O as White; e/f/g/h with 8 -> O-O as Black.

## Project structure (quick tour)

- UI components: `src/components`
- Pages/routes: `src/pages` and `src/router`
- Chess utilities and card logic: `src/utils`
- Localization strings: `src/lang`
