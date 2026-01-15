import { useCallback, useEffect, useMemo, useState } from 'react';
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
	const [isVisible, setIsVisible] = useState(() => (typeof document !== 'undefined' ? document.visibilityState === 'visible' : true));
	const ACTIVE_WINDOW_MS = 2 * 60 * 1000;

	const refs = useMemo(() => {
		if (!gameId) return {};
		return {
			gameRef: doc(db, 'games', gameId),
			gameDataRef: doc(db, 'gameData', gameId),
			movesRef: doc(db, 'gameMoves', gameId),
		};
	}, [gameId]);

	useEffect(() => {
		if (typeof document === 'undefined') return;
		const handleVisibility = () => setIsVisible(document.visibilityState === 'visible');
		document.addEventListener('visibilitychange', handleVisibility);
		return () => document.removeEventListener('visibilitychange', handleVisibility);
	}, []);

	const isActiveAt = useCallback(
		(value: any) => {
			if (!value) return false;
			const ms =
				typeof value === 'number'
					? value
					: typeof value?.toDate === 'function'
						? value.toDate().getTime()
						: typeof value?.seconds === 'number'
							? value.seconds * 1000
							: null;
			return ms !== null ? Date.now() - ms <= ACTIVE_WINDOW_MS : false;
		},
		[ACTIVE_WINDOW_MS]
	);

	const bothActive = useMemo(() => {
		if (!state.gameData) return true;
		return isActiveAt(state.gameData.whiteLastActiveAt) && isActiveAt(state.gameData.blackLastActiveAt);
	}, [isActiveAt, state.gameData]);

	const shouldSubscribeMoves = useMemo(() => {
		if (!isVisible) return false;
		if (!state.gameData) return true;
		if (state.gameData.status === 'playing') return true;
		return bothActive;
	}, [isVisible, state.gameData, bothActive]);

	useEffect(() => {
		if (!gameId || !refs.gameRef || !refs.gameDataRef || !refs.movesRef) {
			setState({ loading: false, error: 'Missing gameId' });
			return;
		}

		let unsubGame: Unsubscribe | undefined;
		let unsubGameData: Unsubscribe | undefined;
		let cancelled = false;

		const loadInitial = async () => {
			try {
				const [gameSnap, gameDataSnap] = await Promise.all([getDoc(refs.gameRef!), getDoc(refs.gameDataRef!)]);
				if (cancelled) return;

				setState((prev) => ({
					...prev,
					game: gameSnap.data() as GameDoc | undefined,
					gameData: gameDataSnap.data() as GameDataDoc | undefined,
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

		if (!isVisible) {
			return () => {
				cancelled = true;
				unsubGame && unsubGame();
				unsubGameData && unsubGameData();
			};
		}

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

		return () => {
			cancelled = true;
			unsubGame && unsubGame();
			unsubGameData && unsubGameData();
		};
	}, [gameId, refs.gameDataRef, refs.gameRef, refs.movesRef, isVisible]);

	useEffect(() => {
		if (!gameId || !refs.movesRef) return;
		if (!shouldSubscribeMoves) return;

		const unsubMoves = onSnapshot(
			refs.movesRef,
			(snap) => {
				if (!snap.exists()) return;
				setState((prev) => ({ ...prev, moves: snap.data() as GameMovesDoc, movesRef: refs.movesRef }));
			},
			(error) => setState((prev) => ({ ...prev, error: error.message }))
		);

		return () => {
			unsubMoves();
		};
	}, [gameId, refs.movesRef, shouldSubscribeMoves]);

	return state;
}
