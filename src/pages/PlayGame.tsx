import { useState, useEffect } from 'react';
import { useParams } from 'react-router';
import { doc, updateDoc, DocumentData, onSnapshot, Unsubscribe, DocumentReference, arrayUnion } from 'firebase/firestore';
import { db } from '../utils/firebase';
import Board from '../components/Board';
import getGame from '../utils/getGame';
import { FormattedMessage, useIntl } from 'react-intl';
import { Link } from 'react-router-dom';
import { CopyToClipboard } from 'react-copy-to-clipboard';
import toast from 'react-hot-toast';

export default function PlayGame() {
	const [gameId, setGameId] = useState<string>(useParams<{ gameId: string }>().gameId || '');
	const [playerToken, setPlayerToken] = useState(localStorage.getItem('playerToken'));
	// const [game, setGame] = useState<DocumentData>();
	const [gameStatus, setGameStatus] = useState<'waiting' | 'playing' | 'finished'>('waiting');
	const [color, setColor] = useState<'w' | 'b'>();
	const [role, setRole] = useState<'participant' | 'spectator'>();
	const [fen, setFen] = useState<string>();
	const [pgn, setPgn] = useState<string>();
	const [lastMove, setLastMove] = useState<{}>();

	const intl = useIntl();

	const [gameDataRef, setGameDataRef] = useState<DocumentReference>();
	const [gameMovesRef, setGameMovesRef] = useState<DocumentReference>();
	const [firstCard, setFirstCard] = useState<string | number>();
	const [boardReady, setBoardReady] = useState(false);
	const [playersPresent, setPlayersPresent] = useState({ w: false, b: false });

	const sendMove = async (move: any, fen: string, pgn: string) => {
		console.log('sendMove', move);
		setLastMove(move);
		gameMovesRef &&
			(await updateDoc(gameMovesRef, {
				moves: arrayUnion(move),
				fen,
				pgn,
			}));
	};

	const sendFirstCard = async (card: string | number) => {
		console.log('sendCard', card);
		gameDataRef &&
			(await updateDoc(gameDataRef, {
				firstCard: card,
			}));
	};

	const setupPlayer = (updatingData: DocumentData, constantData?: DocumentData) => {
		if (!updatingData) return;

		// Determining user role and color
		let currentRole = role;
		let currentColor = color;
		let currentPlayerToken = playerToken;
		let playersArrived = {
			b: updatingData.blackArrived,
			w: updatingData.whiteArrived,
		};
		if (constantData) {
			if (!currentRole) {
				if (constantData.white === currentPlayerToken || constantData.black === currentPlayerToken) {
					currentRole = 'participant';
				} else if (!updatingData.whiteArrived) {
					currentRole = 'participant';
					currentPlayerToken = constantData.white;
				} else if (!updatingData.blackArrived) {
					currentRole = 'participant';
					currentPlayerToken = constantData.black;
				} else {
					currentRole = 'spectator';
				}
			}
			if (currentRole === 'participant' && !currentColor) {
				if (constantData.white === currentPlayerToken) {
					currentColor = 'w';
				} else {
					currentColor = 'b';
				}
			}
			setRole(currentRole);
			setColor(currentColor);
			setPlayerToken(currentPlayerToken);
			currentPlayerToken && localStorage.setItem('playerToken', currentPlayerToken);
			if (!updatingData.whiteArrived && currentRole === 'participant' && currentColor === 'w') {
				// setPlayerArrived('white');
				playersArrived.w = true;
			}
			if (!updatingData.blackArrived && currentRole === 'participant' && currentColor === 'b') {
				// setPlayerArrived('black');
				playersArrived.b = true;
			}
		}

		// setGame(data);
		// let status = updatingData.status;
		if (updatingData.firstCard) setFirstCard(updatingData.firstCard);
		console.log('playersArrived', playersArrived);
		setPlayersPresent(playersArrived);
		// if (playersArrived.w && playersArrived.b && updatingData.status === 'waiting') {
		// 	console.log('updating status to playing');
		// 	status = 'playing';
		// 	setGameStatusToPlaying();
		// }
		// setGameStatus(status);
	};

	const setupMove = (data: DocumentData) => {
		if (!data) return;
		// setGame(data);
		if (data.fen) setFen(data.fen);
		if (data.moves) setLastMove(data.moves[data.moves.length - 1]);
	};

	useEffect(() => {
		let unsubGameData: Unsubscribe, unsubGameMoves: Unsubscribe;

		getGame(gameId).then((gameIds) => {
			const dataRef = doc(db, 'gameData', gameIds.dataId);
			const movesRef = doc(db, 'gameMoves', gameIds.movesId);
			setGameDataRef(dataRef);
			setGameMovesRef(movesRef);
			gameIds.gameData && setupPlayer(gameIds.gameData, gameIds.game);
			gameIds.movesData && setupMove(gameIds.movesData);

			setBoardReady(true);

			unsubGameData = onSnapshot(dataRef, (dataSnap) => {
				const data = dataSnap.data();
				console.log('Current gameData data: ', data);
				data && setupPlayer(data);
			});

			unsubGameMoves = onSnapshot(movesRef, (movesSnap) => {
				const moves = movesSnap.data();
				console.log('Current moves: ', moves);
				moves && setupMove(moves);
			});
		});
		return () => {
			console.log('unsubscribe');
			unsubGameData && unsubGameData();
			unsubGameMoves && unsubGameMoves();
		};
	}, [gameId]);

	useEffect(() => {
		if (gameDataRef && color && role === 'participant' && gameStatus === 'waiting') {
			setPlayerArrived(color === 'w' ? 'white' : 'black');
		}
	}, [gameDataRef, color, role, gameStatus]);

	const setPlayerArrived = async (color: string) => {
		console.log('setPlayerArrived', color, gameDataRef);
		if (!gameDataRef || !color) {
			console.log('setPlayerArrived error');
			return;
		}
		await updateDoc(gameDataRef, {
			[`${color}Arrived`]: true,
		});
	};

	useEffect(() => {
		if (gameDataRef && playersPresent.w && playersPresent.b && gameStatus === 'waiting') {
			setGameStatusToPlaying();
		}
	}, [gameDataRef, playersPresent, gameStatus]);

	const setGameStatusToPlaying = async () => {
		console.log('setGameStatusToPlaying');
		if (!gameDataRef) return;
		setGameStatus('playing');
		await updateDoc(gameDataRef, {
			status: 'playing',
		});
	};

	return (
		<div style={{ paddingTop: 20 }}>
			{/* PlayerToken: {playerToken} */}
			{gameStatus === 'waiting' && (
				<div>
					<p>
						<FormattedMessage id='waiting_for_opponent' />
					</p>
					<p>
						<FormattedMessage id='copy_link_instructions' />
					</p>
					<CopyToClipboard text={window.location.href} onCopy={() => toast.success(intl.formatMessage({ id: 'link_copied' }))}>
						<button className='btn btn-primary'>
							<FormattedMessage id='copy_link' />
						</button>
					</CopyToClipboard>
				</div>
			)}
			{boardReady && (
				<>
					<Board fen={fen} pgn={pgn} lastMove={lastMove} color={color} role={role} sendMove={sendMove} mode='multi' sendFirstCard={sendFirstCard} firstCard={firstCard} />
				</>
			)}
			<p style={{ marginTop: 20 }}>
				<Link to='/chess' className='btn btn-primary'>
					<FormattedMessage id='to_main' />
				</Link>
			</p>
		</div>
	);
}
