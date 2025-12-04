import { Chess } from 'chess.js';
import isValidMove from './isValidMove';
import { Move } from 'chess.js';

describe('isValidMove (card constraints)', () => {
	const game = new Chess(); // standard start
	const moves = game.moves({ verbose: true }) as Move[];

	const findMove = (from: string, to: string) => moves.find((m) => m.from === from && m.to === to)!;

	it('allows move when card matches from/to square (letter)', () => {
		const move = findMove('e2', 'e4');
		expect(isValidMove(move, 'e', game)).toBe(true);
	});

	it('blocks move when card does not match from/to or piece', () => {
		const move = findMove('e2', 'e4');
		expect(isValidMove(move, 'a', game)).toBe(false);
	});

	it('allows check-only card when move gives check', () => {
		const checkGame = new Chess('8/7k/8/8/8/8/8/3QK3 w - - 0 1'); // queen can check king on h5
		const checkMove = checkGame.move({ from: 'd1', to: 'h5' })!;
		expect(isValidMove(checkMove, 'check', checkGame)).toBe(true);
	});
});
