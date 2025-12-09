import { collection, addDoc, setDoc, doc } from 'firebase/firestore';
// import { v4 as uuid } from 'uuid';
import { db } from '../utils/firebase';

import { useNavigate } from 'react-router-dom';
import { Button } from 'react-bootstrap';
import { useContext, useState } from 'react';
import { UserContext } from '../contexts/UserContext';
import TimerPickerModal from './TimerPickerModal';

export default function CreateGame({ buttonVariant = 'primary', buttonSize = 'lg', classes = '', children }: { buttonVariant?: string; buttonSize?: 'lg' | 'sm' | undefined; classes?: string; children: React.ReactNode }) {
	const user = useContext(UserContext);
	const navigate = useNavigate();
	const [timerLimit, setTimerLimit] = useState<number>(5 * 60 * 1000); // default 5 minutes
	const [showTimerPicker, setShowTimerPicker] = useState(false);
	const timerOptions = [
		{ label: '3 min', value: 3 * 60 * 1000 },
		{ label: '5 min', value: 5 * 60 * 1000 },
		{ label: '10 min', value: 10 * 60 * 1000 },
		{ label: '30 min', value: 30 * 60 * 1000 },
		{ label: '1 hour', value: 60 * 60 * 1000 },
	];

	const createGame = async (selectedTimer?: number) => {
		const chosenTimer = selectedTimer ?? timerLimit;
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
			timeLimitMs: chosenTimer,
			whiteTimeLeftMs: chosenTimer,
			blackTimeLeftMs: chosenTimer,
			lastMoveAt: null,
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
			<Button variant={buttonVariant} size={buttonSize} className={classes} onClick={() => setShowTimerPicker(true)}>
				{children}
			</Button>
			<TimerPickerModal
				show={showTimerPicker}
				options={timerOptions}
				selected={timerLimit}
				onClose={() => setShowTimerPicker(false)}
				onSelect={(value) => {
					setTimerLimit(value);
					setShowTimerPicker(false);
					createGame(value);
				}}
			/>
		</>
	);
}
