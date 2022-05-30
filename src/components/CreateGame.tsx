import { collection, addDoc } from 'firebase/firestore';
import { v4 as uuid } from 'uuid';
import { db } from '../utils/firebase';

import { useNavigate } from 'react-router-dom';
import { Button } from 'react-bootstrap';

export default function CreateGame({ buttonVariant = 'primary', buttonSize = 'lg', children }: { buttonVariant?: string; buttonSize?: 'lg' | 'sm' | undefined; children: React.ReactNode }) {
	const navigate = useNavigate();

	const createGame = async () => {
		const playersTokens = {
			b: uuid(),
			w: uuid(),
		};
		// Random choice between 'w' and 'b'
		const color = Math.random() > 0.5 ? 'w' : 'b';
		// Write token to localStorage
		localStorage.setItem('playerToken', playersTokens[color]);
		const newGame = await addDoc(collection(db, 'games'), {
			createdAt: new Date(),
			black: playersTokens.b,
			white: playersTokens.w,
		});
		console.log(newGame);

		await addDoc(collection(db, 'gameData'), {
			gameId: newGame.id,
			status: 'waiting',
			whiteArrived: color === 'w',
			blackArrived: color === 'b',
			firstCard: '',
		});

		await addDoc(collection(db, 'gameMoves'), {
			gameId: newGame.id,
			moves: [],
			fen: '',
			pgn: '',
		});

		navigate(`/chess/play/${newGame.id}`);
	};

	return (
		<>
			<Button variant={buttonVariant} size={buttonSize} onClick={createGame}>
				{children}
			</Button>
		</>
	);
}
