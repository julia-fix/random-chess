import { Chess } from 'chess.js';
import { cards } from './cardsList';
import isValidMove from './isValidMove';

export type DeckState = {
	remaining: Array<string | number>;
};

export type CardDraw = {
	card: string | number;
	deck: DeckState;
};

/**
 * Draws the next card that allows at least one valid move for the current position.
 * Returns the selected card and the new deck (immutably).
 */
export function drawNextCard(deck: DeckState, game: Chess, gameCopy: Chess): CardDraw {
	let cardCandidate: string | number = '';
	let cardPossible = false;
	let remaining = [...deck.remaining];

	do {
		const index = Math.floor(Math.random() * remaining.length);
		cardCandidate = remaining[index];
		// remove first occurrence immutably
		remaining = remaining.filter((c, i) => i !== index);
		if (!remaining.length) remaining = [...cards];

		const possibleMoves = game.moves({ verbose: true });
		for (const move of possibleMoves) {
			if (isValidMove(move, cardCandidate, gameCopy)) {
				cardPossible = true;
				break;
			}
		}
	} while (!cardPossible);

	return { card: cardCandidate, deck: { remaining } };
}

export function initialDeck(): DeckState {
	return { remaining: [...cards] };
}
