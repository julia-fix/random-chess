import { collection, addDoc, setDoc, doc } from 'firebase/firestore';
// import { v4 as uuid } from 'uuid';
import { db } from '../utils/firebase';

import { useNavigate } from 'react-router-dom';
import { Button } from 'react-bootstrap';
import { useContext } from 'react';
import { UserContext } from '../contexts/UserContext';

export default function CreateGame({ buttonVariant = 'primary', buttonSize = 'lg', classes = '', children }: { buttonVariant?: string; buttonSize?: 'lg' | 'sm' | undefined; classes?: string; children: React.ReactNode }) {
	const user = useContext(UserContext);
	const navigate = useNavigate();

	const createGame = async () => {
		// Random choice between 'w' and 'b'
		const color = Math.random() > 0.5 ? 'w' : 'b';

		const playersTokens = {
			b: color === 'b' ? user.uid : null,
			w: color === 'w' ? user.uid : null,
		};

		// Write token to localStorage
		// localStorage.setItem('playerToken', playersTokens[color]);
		const newGame = await addDoc(collection(db, 'games'), {
			createdAt: new Date(),
			black: playersTokens.b,
			white: playersTokens.w,
		});
		// console.log(newGame);

		await setDoc(doc(db, 'gameData', newGame.id), {
			gameId: newGame.id,
			status: 'waiting',
			whiteArrived: color === 'w',
			blackArrived: color === 'b',
			firstCard: '',
			createdAt: new Date(),
		});

		await setDoc(doc(db, 'gameMoves', newGame.id), {
			gameId: newGame.id,
			moves: [],
			fen: '',
			pgn: '',
			createdAt: new Date(),
		});

		await setDoc(doc(db, 'chats', newGame.id), {
			gameId: newGame.id,
			messages: [],
			createdAt: new Date(),
			unread: {},
		});

		navigate(`/chess/play/${newGame.id}`);
	};

	return (
		<>
			<Button variant={buttonVariant} size={buttonSize} className={classes} onClick={createGame}>
				{children}
			</Button>
		</>
	);
}
