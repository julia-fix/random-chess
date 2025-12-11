import { updateMovesDoc, updateFirstCard, markPlayerArrived, setGameStatus } from './gameService';
import { vi } from 'vitest';

vi.mock('firebase/firestore', async () => {
	const updateDoc = vi.fn();
	const arrayUnion = (...values: any[]) => ({ _arrayUnion: values });
	const setDoc = vi.fn();
	return { updateDoc, arrayUnion, setDoc };
});

const firestore = await import('firebase/firestore');
const updateDoc = firestore.updateDoc as ReturnType<typeof vi.fn>;
const setDoc = firestore.setDoc as ReturnType<typeof vi.fn>;
const arrayUnion = firestore.arrayUnion;

describe('gameService.updateMovesDoc', () => {
	beforeEach(() => {
		vi.clearAllMocks();
	});

	it('removes undefined fields from move before writing', async () => {
		const movesRef = { id: 'movesRef' } as any;
		const move = { from: 'e2', to: 'e4', extra: undefined };
		await updateMovesDoc(movesRef, move, 'fen', 'pgn');
		expect(setDoc).toHaveBeenCalledWith(
			movesRef,
			expect.objectContaining({
				gameId: 'movesRef',
				moves: { _arrayUnion: [expect.objectContaining({ from: 'e2', to: 'e4' })] },
				fen: 'fen',
				pgn: 'pgn',
			}),
			expect.objectContaining({ merge: true })
		);
	});

	it('marks player arrived writes to game and gameData', async () => {
		const gameRef = { id: 'game' } as any;
		const gameDataRef = { id: 'gameData' } as any;
		await markPlayerArrived(gameRef, gameDataRef, 'white', 'uid', 'Name');
		expect(updateDoc).toHaveBeenCalledTimes(2);
		expect(updateDoc).toHaveBeenCalledWith(gameRef, { white: 'uid', whiteName: 'Name', participants: { _arrayUnion: ['uid'] } });
		expect(updateDoc).toHaveBeenCalledWith(gameDataRef, { whiteArrived: true });
	});

	it('setGameStatus writes status', async () => {
		const gameDataRef = { id: 'gameData' } as any;
		await setGameStatus(gameDataRef, 'playing');
		expect(updateDoc).toHaveBeenCalledWith(gameDataRef, { status: 'playing' });
	});

	it('updateFirstCard writes card', async () => {
		const gameDataRef = { id: 'gameData' } as any;
		await updateFirstCard(gameDataRef, 'Q');
		expect(updateDoc).toHaveBeenCalledWith(gameDataRef, { firstCard: 'Q' });
	});
});
