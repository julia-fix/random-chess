import { query, where, limit, collection, getDocs, doc, getDoc } from 'firebase/firestore';
import { db } from '../utils/firebase';

export default async function getGame(gameId: string): Promise<{ dataId: string; movesId: string; gameData: {}; movesData: {}; game: {} }> {
	let gameParts = {
		dataId: '',
		movesId: '',
		gameData: {},
		movesData: {},
		game: {},
	};
	const q = query(collection(db, 'gameData'), where('gameId', '==', gameId), limit(1));

	const querySnapshot = await getDocs(q);
	querySnapshot.forEach((doc) => {
		console.log('gameData.id', doc.id);
		gameParts.dataId = doc.id;
		gameParts.gameData = doc.data();
	});

	const q2 = query(collection(db, 'gameMoves'), where('gameId', '==', gameId), limit(1));
	const querySnapshot2 = await getDocs(q2);
	querySnapshot2.forEach((doc) => {
		console.log('gameMoves.id', doc.id);
		gameParts.movesId = doc.id;
		gameParts.movesData = doc.data();
	});

	const docRef = doc(db, 'games', gameId);
	const docSnap = await getDoc(docRef);

	if (docSnap.exists()) {
		gameParts.game = docSnap.data();
	}

	return gameParts;
}
