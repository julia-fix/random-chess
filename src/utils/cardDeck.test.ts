import { describe, it, expect, beforeEach, vi } from 'vitest';
import { drawNextCard, initialDeck } from './cardDeck';
import { Chess } from 'chess.js';

const mockMoves = [
	{
		color: 'w',
		from: 'a2',
		to: 'a3',
		piece: 'p',
		san: 'a3',
		flags: '',
	},
] as any;

class MockChess extends Chess {
	moves() {
		return mockMoves;
	}
}

describe('cardDeck utils', () => {
	beforeEach(() => {
		vi.spyOn(Math, 'random').mockReturnValue(0);
	});

	it('drawNextCard skips invalid cards until a valid one is found', () => {
		const game = new MockChess();
		const gameCopy = new MockChess();
		const deck = initialDeck();
		const { card, deck: nextDeck } = drawNextCard(deck, game, gameCopy);
		expect(['a', 'A', 2]).toContain(card); // card matching a2/a3 (rank or file)
		expect(nextDeck.remaining.length).toBeLessThan(deck.remaining.length);
	});

	it('initialDeck returns full card set copy', () => {
		const deck = initialDeck();
		const second = initialDeck();
		expect(deck.remaining).not.toBe(second.remaining);
		expect(deck.remaining.length).toBeGreaterThan(0);
	});
});
