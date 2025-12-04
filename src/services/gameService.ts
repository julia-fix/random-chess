import { DocumentReference, updateDoc, arrayUnion } from 'firebase/firestore';

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
