import { doc, getDoc, DocumentReference } from 'firebase/firestore';
import { db } from '../utils/firebase';

interface gameReturnData {
	gameData: {};
	movesData: {};
	game: {};
	gameDataRef?: DocumentReference;
	movesDataRef?: DocumentReference;
	gameRef?: DocumentReference;
}

export default async function getGame(gameId: string): Promise<gameReturnData> {
	let gameParts: gameReturnData = {
		gameData: {},
		movesData: {},
		game: {},
	};

	const docRef = doc(db, 'games', gameId);
	gameParts.gameRef = docRef;
	const docSnap = await getDoc(docRef);
	if (docSnap.exists()) {
		gameParts.game = docSnap.data();
	}

	const docDataRef = doc(db, 'gameData', gameId);
	gameParts.gameDataRef = docDataRef;
	const docDataSnap = await getDoc(docDataRef);
	if (docDataSnap.exists()) {
		gameParts.gameData = docDataSnap.data();
	}

	const docMovesRef = doc(db, 'gameMoves', gameId);
	gameParts.movesDataRef = docMovesRef;
	const docMovesSnap = await getDoc(docMovesRef);
	if (docMovesSnap.exists()) {
		gameParts.movesData = docMovesSnap.data();
	}

	return gameParts;
}
