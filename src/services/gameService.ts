import * as Firestore from 'firebase/firestore';
import { logWrite } from '../utils/fbLogger';
import { ttlExpiresAt } from '../utils/ttl';

type DocumentReference = Firestore.DocumentReference;
const safeGet = (key: string) => {
	try {
		return (Firestore as any)[key];
	} catch {
		return undefined;
	}
};
const maybeDeleteField = () => {
	const fn = safeGet('deleteField');
	return typeof fn === 'function' ? fn() : undefined;
};
const maybeArrayUnion = (...items: any[]) => {
	const fn = safeGet('arrayUnion');
	return typeof fn === 'function' ? fn(...items) : items;
};

const sanitize = (value: any): any => {
	if (Array.isArray(value)) return value.map(sanitize);
	if (value && typeof value === 'object') {
		const cleaned: any = {};
		Object.entries(value).forEach(([k, v]) => {
			if (v !== undefined) cleaned[k] = sanitize(v);
		});
		return cleaned;
	}
	return value;
};

const maybeServerTimestamp = () => {
	const fn = safeGet('serverTimestamp');
	return typeof fn === 'function' ? fn() : new Date();
};

export async function updateMovesDoc(movesRef: DocumentReference | undefined, move: any, fen: string, pgn: string, gameId?: string) {
	if (!movesRef) return;
	const safeMove = sanitize(move);
	// Use setDoc with merge so the doc is created if missing and arrayUnion still works.
	await logWrite('updateMovesDoc', movesRef, { safeMove, fen, pgn }, () =>
		Firestore.setDoc(
			movesRef,
			{
				gameId: gameId ?? movesRef.id,
				moves: maybeArrayUnion(safeMove),
				fen,
				pgn,
				createdAt: maybeServerTimestamp(),
				expiresAt: ttlExpiresAt(),
			},
			{ merge: true }
		)
	);
}

export async function updateFirstCard(gameDataRef: DocumentReference | undefined, card: string | number) {
	if (!gameDataRef) return;
	await logWrite('updateFirstCard', gameDataRef, { card }, () => Firestore.updateDoc(gameDataRef, { firstCard: card }));
}

export async function markPlayerArrived(
	gameRef: DocumentReference | undefined,
	gameDataRef: DocumentReference | undefined,
	colorKey: 'white' | 'black',
	uid: string | null | undefined,
	displayName?: string | null
) {
	if (!gameRef || !gameDataRef || !uid) return;
	const nameKey = `${colorKey}Name`;
	const activeKey = `${colorKey}LastActiveAt`;
	const playerName = displayName || 'Guest';
	await logWrite('markPlayerArrived:game', gameRef, { [colorKey]: uid, [nameKey]: playerName }, () =>
		Firestore.updateDoc(gameRef, { [colorKey]: uid, [nameKey]: playerName, participants: maybeArrayUnion(uid) })
	);
	await logWrite('markPlayerArrived:gameData', gameDataRef, { [`${colorKey}Arrived`]: true }, () =>
		Firestore.updateDoc(gameDataRef, { [`${colorKey}Arrived`]: true, [activeKey]: maybeServerTimestamp() })
	);
}

export async function updatePlayerLastActive(gameDataRef: DocumentReference | undefined, color: 'w' | 'b') {
	if (!gameDataRef) return;
	const activeKey = color === 'w' ? 'whiteLastActiveAt' : 'blackLastActiveAt';
	await logWrite('updatePlayerLastActive', gameDataRef, { activeKey }, () =>
		Firestore.updateDoc(gameDataRef, { [activeKey]: maybeServerTimestamp() })
	);
}

export async function setGameStatus(gameDataRef: DocumentReference | undefined, status: 'waiting' | 'playing' | 'finished') {
	if (!gameDataRef) return;
	await logWrite('setGameStatus', gameDataRef, { status }, () => Firestore.updateDoc(gameDataRef, { status }));
}

export async function finishGame(
	gameDataRef: DocumentReference | undefined,
	winner: 'w' | 'b' | null,
	resultReason: 'timeout' | 'resign' | 'agreement' | 'stalemate' | 'checkmate' | 'insufficient' | 'other'
) {
	if (!gameDataRef) return;
	await logWrite(
		'finishGame',
		gameDataRef,
		{ winner, resultReason },
		() =>
			Firestore.updateDoc(gameDataRef, {
				status: 'finished',
				winner,
				resultReason,
				drawOffer: maybeDeleteField(),
			})
	);
}

export async function offerDraw(gameDataRef: DocumentReference | undefined, by: 'w' | 'b') {
	if (!gameDataRef) return;
	await logWrite('offerDraw', gameDataRef, { by }, () => Firestore.updateDoc(gameDataRef, { drawOffer: { by } }));
}

export async function clearDrawOffer(gameDataRef: DocumentReference | undefined) {
	if (!gameDataRef) return;
	await logWrite('clearDrawOffer', gameDataRef, {}, () => Firestore.updateDoc(gameDataRef, { drawOffer: maybeDeleteField() }));
}

export async function updateClocksOnMove(
	gameDataRef: DocumentReference | undefined,
	movedColor: 'w' | 'b',
	lastMoveAt: Date | null,
	whiteTimeLeftMs?: number,
	blackTimeLeftMs?: number,
	skipElapsed?: boolean
) {
	if (!gameDataRef || whiteTimeLeftMs === undefined || blackTimeLeftMs === undefined) return;
	const now = Date.now();
	let elapsed = 0;
	if (lastMoveAt && !skipElapsed) {
		elapsed = now - new Date(lastMoveAt).getTime();
	}
	const updated = { whiteTimeLeftMs, blackTimeLeftMs };
	if (movedColor === 'w') {
		updated.whiteTimeLeftMs = Math.max(0, whiteTimeLeftMs - elapsed);
	} else {
		updated.blackTimeLeftMs = Math.max(0, blackTimeLeftMs - elapsed);
	}
	await Firestore.updateDoc(gameDataRef, {
		...updated,
		lastMoveAt: maybeServerTimestamp(),
	});
}

export async function setClocksSnapshot(
	gameDataRef: DocumentReference | undefined,
	whiteTimeLeftMs?: number,
	blackTimeLeftMs?: number
) {
	if (!gameDataRef || whiteTimeLeftMs === undefined || blackTimeLeftMs === undefined) return;
	await Firestore.updateDoc(gameDataRef, {
		whiteTimeLeftMs,
		blackTimeLeftMs,
		lastMoveAt: maybeServerTimestamp(),
	});
}
