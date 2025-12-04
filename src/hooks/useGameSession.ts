import { useEffect, useMemo, useState } from 'react';
import { doc, getDoc, onSnapshot, DocumentReference, Unsubscribe } from 'firebase/firestore';
import { db } from '../utils/firebase';
import { GameDataDoc, GameDoc, GameMovesDoc } from '../types/game';

export type GameSessionState = {
	game?: GameDoc;
	gameData?: GameDataDoc;
	moves?: GameMovesDoc;
	gameRef?: DocumentReference;
	gameDataRef?: DocumentReference;
	movesRef?: DocumentReference;
	loading: boolean;
	error?: string;
};

export default function useGameSession(gameId?: string): GameSessionState {
	const [state, setState] = useState<GameSessionState>({ loading: true });

	const refs = useMemo(() => {
		if (!gameId) return {};
		return {
			gameRef: doc(db, 'games', gameId),
			gameDataRef: doc(db, 'gameData', gameId),
			movesRef: doc(db, 'gameMoves', gameId),
		};
	}, [gameId]);

	useEffect(() => {
		if (!gameId || !refs.gameRef || !refs.gameDataRef || !refs.movesRef) {
			setState({ loading: false, error: 'Missing gameId' });
			return;
		}

		let unsubGame: Unsubscribe | undefined;
		let unsubGameData: Unsubscribe | undefined;
		let unsubMoves: Unsubscribe | undefined;
		let cancelled = false;

		const loadInitial = async () => {
			try {
				const [gameSnap, gameDataSnap, movesSnap] = await Promise.all([getDoc(refs.gameRef!), getDoc(refs.gameDataRef!), getDoc(refs.movesRef!)]);
				if (cancelled) return;

				setState((prev) => ({
					...prev,
					game: gameSnap.data() as GameDoc | undefined,
					gameData: gameDataSnap.data() as GameDataDoc | undefined,
					moves: movesSnap.data() as GameMovesDoc | undefined,
					gameRef: refs.gameRef,
					gameDataRef: refs.gameDataRef,
					movesRef: refs.movesRef,
					loading: false,
					error: undefined,
				}));
			} catch (e: any) {
				if (cancelled) return;
				setState({ loading: false, error: e?.message || 'Failed to load game data' });
			}
		};

		loadInitial();

		unsubGame = onSnapshot(
			refs.gameRef,
			(snap) => {
				if (!snap.exists()) {
					setState((prev) => ({ ...prev, error: 'game_not_found', loading: false }));
					return;
				}
				setState((prev) => ({ ...prev, game: snap.data() as GameDoc, gameRef: refs.gameRef, loading: false, error: undefined }));
			},
			(error) => setState((prev) => ({ ...prev, error: error.message, loading: false }))
		);

		unsubGameData = onSnapshot(
			refs.gameDataRef,
			(snap) => {
				if (!snap.exists()) return;
				setState((prev) => ({ ...prev, gameData: snap.data() as GameDataDoc, gameDataRef: refs.gameDataRef }));
			},
			(error) => setState((prev) => ({ ...prev, error: error.message }))
		);

		unsubMoves = onSnapshot(
			refs.movesRef,
			(snap) => {
				if (!snap.exists()) return;
				setState((prev) => ({ ...prev, moves: snap.data() as GameMovesDoc, movesRef: refs.movesRef }));
			},
			(error) => setState((prev) => ({ ...prev, error: error.message }))
		);

		return () => {
			cancelled = true;
			unsubGame && unsubGame();
			unsubGameData && unsubGameData();
			unsubMoves && unsubMoves();
		};
	}, [gameId, refs.gameDataRef, refs.gameRef, refs.movesRef]);

	return state;
}
