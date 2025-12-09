import { DocumentReference, updateDoc, arrayUnion, serverTimestamp, deleteField } from 'firebase/firestore';

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

export async function updateMovesDoc(movesRef: DocumentReference | undefined, move: any, fen: string, pgn: string) {
	if (!movesRef) return;
	const safeMove = sanitize(move);
	await updateDoc(movesRef, {
		moves: arrayUnion(safeMove),
		fen,
		pgn,
	});
}

export async function updateFirstCard(gameDataRef: DocumentReference | undefined, card: string | number) {
	if (!gameDataRef) return;
	await updateDoc(gameDataRef, { firstCard: card });
}

export async function markPlayerArrived(
	gameRef: DocumentReference | undefined,
	gameDataRef: DocumentReference | undefined,
	colorKey: 'white' | 'black',
	uid: string | null | undefined
) {
	if (!gameRef || !gameDataRef || !uid) return;
	await updateDoc(gameRef, { [colorKey]: uid });
	await updateDoc(gameDataRef, { [`${colorKey}Arrived`]: true });
}

export async function setGameStatus(gameDataRef: DocumentReference | undefined, status: 'waiting' | 'playing' | 'finished') {
	if (!gameDataRef) return;
	await updateDoc(gameDataRef, { status });
}

export async function finishGame(
	gameDataRef: DocumentReference | undefined,
	winner: 'w' | 'b' | null,
	resultReason: 'timeout' | 'resign' | 'agreement' | 'stalemate' | 'checkmate' | 'other'
) {
	if (!gameDataRef) return;
	await updateDoc(gameDataRef, {
		status: 'finished',
		winner,
		resultReason,
		drawOffer: deleteField(),
	});
}

export async function offerDraw(gameDataRef: DocumentReference | undefined, by: 'w' | 'b') {
	if (!gameDataRef) return;
	await updateDoc(gameDataRef, { drawOffer: { by } });
}

export async function clearDrawOffer(gameDataRef: DocumentReference | undefined) {
	if (!gameDataRef) return;
	await updateDoc(gameDataRef, { drawOffer: deleteField() });
}

export async function updateClocksOnMove(
	gameDataRef: DocumentReference | undefined,
	movedColor: 'w' | 'b',
	lastMoveAt: Date | null,
	whiteTimeLeftMs?: number,
	blackTimeLeftMs?: number
) {
	if (!gameDataRef || whiteTimeLeftMs === undefined || blackTimeLeftMs === undefined) return;
	const now = Date.now();
	let elapsed = 0;
	if (lastMoveAt) {
		elapsed = now - new Date(lastMoveAt).getTime();
	}
	const updated = { whiteTimeLeftMs, blackTimeLeftMs };
	if (movedColor === 'w') {
		updated.whiteTimeLeftMs = Math.max(0, whiteTimeLeftMs - elapsed);
	} else {
		updated.blackTimeLeftMs = Math.max(0, blackTimeLeftMs - elapsed);
	}
	await updateDoc(gameDataRef, {
		...updated,
		lastMoveAt: serverTimestamp(),
	});
}

export async function setClocksSnapshot(
	gameDataRef: DocumentReference | undefined,
	whiteTimeLeftMs?: number,
	blackTimeLeftMs?: number
) {
	if (!gameDataRef || whiteTimeLeftMs === undefined || blackTimeLeftMs === undefined) return;
	await updateDoc(gameDataRef, {
		whiteTimeLeftMs,
		blackTimeLeftMs,
		lastMoveAt: serverTimestamp(),
	});
}
