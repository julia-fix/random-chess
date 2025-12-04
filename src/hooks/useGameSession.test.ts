import { describe, it, expect, vi, beforeEach } from 'vitest';
import useGameSession from './useGameSession';
import { renderHook, act } from '@testing-library/react';

let snapshotHandlers: Array<(snap: any) => void> = [];

vi.mock('firebase/firestore', () => {
	const mockDoc = vi.fn((db: any, collection: string, id: string) => ({ collection, id }));
	const mockGetDoc = vi.fn(async (ref: any) => ({
		exists: () => true,
		data: () => {
			if (ref.collection === 'games') return { white: 'w', black: 'b' };
			if (ref.collection === 'gameData') return { status: 'waiting', whiteArrived: true, blackArrived: false };
			if (ref.collection === 'gameMoves') return { moves: [{ from: 'e2', to: 'e4' }], fen: 'fen', pgn: 'pgn' };
			return {};
		},
	}));

	const mockOnSnapshot = vi.fn((ref: any, onNext: any, onError?: any) => {
		snapshotHandlers.push(onNext);
		onNext({
			exists: () => true,
			data: () => (ref.collection === 'games' ? { white: 'w', black: 'b' } : { status: 'waiting' }),
		});
		return () => {};
	});

	return {
		doc: mockDoc,
		getDoc: mockGetDoc,
		onSnapshot: mockOnSnapshot,
		getFirestore: vi.fn(),
		__mock__: { mockDoc, mockGetDoc, mockOnSnapshot },
	};
});

const { __mock__ } = await import('firebase/firestore');
const { mockGetDoc, mockOnSnapshot } = __mock__ as any;

describe('useGameSession', () => {
	beforeEach(() => {
		mockGetDoc.mockClear();
		mockOnSnapshot.mockClear();
		snapshotHandlers = [];
	});

	it('returns error when gameId missing', async () => {
		const { result } = renderHook(() => useGameSession(undefined));
		expect(result.current.error).toBe('Missing gameId');
		expect(result.current.loading).toBe(false);
	});

	it('loads initial game docs and subscribes', async () => {
		const { result } = renderHook(() => useGameSession('game-1'));
		expect(mockGetDoc).toHaveBeenCalled();
		// wait for state update after async load
		await act(async () => {});
		expect(result.current.game?.white).toBe('w');
		expect(result.current.gameData?.status).toBe('waiting');
		expect(result.current.moves?.fen).toBe('fen');
		expect(result.current.loading).toBe(false);
	});

	it('handles onSnapshot errors', async () => {
		mockGetDoc.mockRejectedValueOnce(new Error('boom'));
		const { result } = renderHook(() => useGameSession('game-2'));
		await act(async () => {});
		expect(result.current.error).toBeDefined();
	});
});
