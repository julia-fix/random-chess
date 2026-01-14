import { Chess } from 'chess.js';
import { describe, it, expect } from 'vitest';
import checkMove from './checkMove';

describe('checkMove', () => {
	it('returns move when chess move and card constraint are valid', () => {
		const game = new Chess();
		const gameCopy = new Chess();
		const move = checkMove('e2', 'e4', undefined, game, gameCopy, 'e');
		expect(move?.from).toBe('e2');
		expect(move?.to).toBe('e4');
	});

	it('returns null when card constraint fails', () => {
		const game = new Chess();
		const gameCopy = new Chess();
		const move = checkMove('e2', 'e4', undefined, game, gameCopy, 'a');
		expect(move).toBeNull();
	});

	it('returns null when chess move is illegal', () => {
		const game = new Chess();
		const gameCopy = new Chess();
		const move = checkMove('e2', 'e5', undefined, game, gameCopy, 'e');
		expect(move).toBeNull();
	});
});
