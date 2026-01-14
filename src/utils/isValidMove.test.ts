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

	it('allows pawn card for pawn moves', () => {
		const move = findMove('e2', 'e4');
		expect(isValidMove(move, 'p', game)).toBe(true);
	});

	it('allows piece card when move uses that piece', () => {
		const knightMove = findMove('g1', 'f3');
		expect(isValidMove(knightMove, 'N', game)).toBe(true);
	});

	it('allows take card when move captures', () => {
		const captureGame = new Chess('8/8/8/3p4/4P3/8/8/4K2k w - - 0 1');
		const captureMove = captureGame.move({ from: 'e4', to: 'd5' })!;
		expect(isValidMove(captureMove, 'take', captureGame)).toBe(true);
	});

	it('allows stalemate card when move produces stalemate', () => {
		const stalemateGame = new Chess('7k/5K2/8/6Q1/8/8/8/8 w - - 0 1');
		const move = stalemateGame.move({ from: 'g5', to: 'g6' })!;
		stalemateGame.undo();
		expect(isValidMove(move, 'stalemate', stalemateGame)).toBe(true);
	});

	it('allows castling when card matches castling squares', () => {
		const castleGame = new Chess('r3k2r/8/8/8/8/8/8/R3K2R w KQkq - 0 1');
		const castleMove = castleGame.move({ from: 'e1', to: 'g1' })!;
		castleGame.undo();
		expect(isValidMove(castleMove, 'g', castleGame)).toBe(true);
	});
});
