import {
	updateMovesDoc,
	updateFirstCard,
	markPlayerArrived,
	setGameStatus,
	finishGame,
	offerDraw,
	clearDrawOffer,
	updateClocksOnMove,
	setClocksSnapshot,
} from './gameService';
import { vi, beforeEach } from 'vitest';

vi.mock('firebase/firestore', async () => {
	const updateDoc = vi.fn();
	const arrayUnion = (...values: any[]) => ({ _arrayUnion: values });
	const setDoc = vi.fn();
	const deleteField = vi.fn(() => '__delete__');
	const serverTimestamp = vi.fn(() => '__server_ts__');
	return { updateDoc, arrayUnion, setDoc, deleteField, serverTimestamp };
});

const firestore = await import('firebase/firestore');
const updateDoc = firestore.updateDoc as ReturnType<typeof vi.fn>;
const setDoc = firestore.setDoc as ReturnType<typeof vi.fn>;
const arrayUnion = firestore.arrayUnion;
const deleteField = firestore.deleteField as ReturnType<typeof vi.fn>;
const serverTimestamp = firestore.serverTimestamp as ReturnType<typeof vi.fn>;

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
		expect(updateDoc).toHaveBeenCalledWith(gameDataRef, { whiteArrived: true, whiteLastActiveAt: '__server_ts__' });
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

	it('finishGame updates status and clears draw offer', async () => {
		const gameDataRef = { id: 'gameData' } as any;
		await finishGame(gameDataRef, 'w', 'checkmate');
		expect(deleteField).toHaveBeenCalled();
		expect(updateDoc).toHaveBeenCalledWith(gameDataRef, {
			status: 'finished',
			winner: 'w',
			resultReason: 'checkmate',
			drawOffer: '__delete__',
		});
	});

	it('offerDraw writes draw offer', async () => {
		const gameDataRef = { id: 'gameData' } as any;
		await offerDraw(gameDataRef, 'b');
		expect(updateDoc).toHaveBeenCalledWith(gameDataRef, { drawOffer: { by: 'b' } });
	});

	it('clearDrawOffer deletes drawOffer', async () => {
		const gameDataRef = { id: 'gameData' } as any;
		await clearDrawOffer(gameDataRef);
		expect(updateDoc).toHaveBeenCalledWith(gameDataRef, { drawOffer: '__delete__' });
	});

	it('updateClocksOnMove updates time and timestamp', async () => {
		vi.useFakeTimers();
		vi.setSystemTime(new Date('2024-01-01T00:00:10Z'));
		const gameDataRef = { id: 'gameData' } as any;
		await updateClocksOnMove(gameDataRef, 'w', new Date('2024-01-01T00:00:00Z'), 10000, 8000);
		expect(serverTimestamp).toHaveBeenCalled();
		expect(updateDoc).toHaveBeenCalledWith(gameDataRef, {
			whiteTimeLeftMs: 0,
			blackTimeLeftMs: 8000,
			lastMoveAt: '__server_ts__',
		});
		vi.useRealTimers();
	});

	it('setClocksSnapshot writes clock values and timestamp', async () => {
		const gameDataRef = { id: 'gameData' } as any;
		await setClocksSnapshot(gameDataRef, 1200, 3400);
		expect(serverTimestamp).toHaveBeenCalled();
		expect(updateDoc).toHaveBeenCalledWith(gameDataRef, {
			whiteTimeLeftMs: 1200,
			blackTimeLeftMs: 3400,
			lastMoveAt: '__server_ts__',
		});
	});
});
