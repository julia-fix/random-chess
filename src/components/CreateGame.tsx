import { collection, addDoc, setDoc, doc, serverTimestamp } from 'firebase/firestore';
// import { v4 as uuid } from 'uuid';
import { db } from '../utils/firebase';
import { ttlExpiresAt } from '../utils/ttl';

import { useLocation, useNavigate } from 'react-router-dom';
import { Button } from 'react-bootstrap';
import { useContext, useState } from 'react';
import { useIntl } from 'react-intl';
import { UserContext } from '../contexts/UserContext';
import TimerPickerModal from './TimerPickerModal';

export default function CreateGame({
	buttonVariant = 'primary',
	buttonSize = 'lg',
	classes = '',
	children,
	onAfterSelect,
}: {
	buttonVariant?: string;
	buttonSize?: 'lg' | 'sm' | undefined;
	classes?: string;
	children: React.ReactNode;
	onAfterSelect?: () => void;
}) {
	const user = useContext(UserContext);
	const navigate = useNavigate();
	const location = useLocation();
	const intl = useIntl();
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
		// Require login before creating a game; redirect to auth preserving current path
		if (!user.loggedIn || !user.uid) {
			navigate(`/${intl.locale}/auth?redirectUrl=` + encodeURIComponent(location.pathname + location.search));
			return;
		}

		const chosenTimer = selectedTimer ?? timerLimit;
		// Random choice between 'w' and 'b'
		const color = Math.random() > 0.5 ? 'w' : 'b';

		const playersTokens = {
			b: color === 'b' ? user.uid : null,
			w: color === 'w' ? user.uid : null,
		};
		const playerNames = {
			b: color === 'b' ? user.displayName || 'Guest' : null,
			w: color === 'w' ? user.displayName || 'Guest' : null,
		};

		// Write token to localStorage
		// localStorage.setItem('playerToken', playersTokens[color]);
		const newGame = await addDoc(collection(db, 'games'), {
			createdAt: serverTimestamp(),
			expiresAt: ttlExpiresAt(),
			black: playersTokens.b,
			white: playersTokens.w,
			blackName: playerNames.b,
			whiteName: playerNames.w,
			participants: playersTokens.b || playersTokens.w ? [user.uid] : [],
		});

		await setDoc(
			doc(db, 'gameData', newGame.id),
			{
				gameId: newGame.id,
				status: 'waiting',
				whiteArrived: color === 'w',
				blackArrived: color === 'b',
				whiteLastActiveAt: color === 'w' ? serverTimestamp() : null,
				blackLastActiveAt: color === 'b' ? serverTimestamp() : null,
				firstCard: '',
				createdAt: serverTimestamp(),
				expiresAt: ttlExpiresAt(),
				timeLimitMs: chosenTimer,
				whiteTimeLeftMs: chosenTimer,
				blackTimeLeftMs: chosenTimer,
				lastMoveAt: null,
			},
			{ merge: true }
		);

		navigate(`/${intl.locale}/play/${newGame.id}`);
	};

	return (
		<>
			<Button
				variant={buttonVariant}
				size={buttonSize}
				className={classes}
				onClick={() => {
					setShowTimerPicker(true);
				}}
			>
				{children}
			</Button>
			<TimerPickerModal
				show={showTimerPicker}
				options={timerOptions}
				// No preselection highlight; user picks explicitly
				selected={undefined}
				onClose={() => setShowTimerPicker(false)}
				onSelect={(value) => {
					setTimerLimit(value);
					setShowTimerPicker(false);
					onAfterSelect?.();
					createGame(value);
				}}
			/>
		</>
	);
}
