import { useState, useEffect, useCallback, useContext } from 'react';
import { useParams } from 'react-router';
import { updateDoc, DocumentData, onSnapshot, Unsubscribe, DocumentReference, arrayUnion } from 'firebase/firestore';
import Board from '../components/Board';
import getGame from '../utils/getGame';
import { FormattedMessage, useIntl } from 'react-intl';
import { CopyToClipboard } from 'react-copy-to-clipboard';
import toast from 'react-hot-toast';
import { UserContext } from '../contexts/UserContext';
import GameChat from '../components/GameChat';

export default function PlayGame() {
	const user = useContext(UserContext);
	const [gameId] = useState<string>(useParams<{ gameId: string }>().gameId || '');
	// const [playerToken, setPlayerToken] = useState(localStorage.getItem('playerToken'));
	// const [game, setGame] = useState<DocumentData>();
	const [gameStatus, setGameStatus] = useState<'waiting' | 'playing' | 'finished'>('waiting');
	const [color, setColor] = useState<'w' | 'b'>();
	const [role, setRole] = useState<'participant' | 'spectator'>();
	const [fen, setFen] = useState<string>();
	const [pgn, setPgn] = useState<string>();
	const [lastMove, setLastMove] = useState<{}>();
	const [players, setPlayers] = useState<{ w: string | null; b: string | null }>({ w: null, b: null });

	const intl = useIntl();

	const [gameDataRef, setGameDataRef] = useState<DocumentReference>();
	const [gameMovesRef, setGameMovesRef] = useState<DocumentReference>();
	const [gameGameRef, setGameGameRef] = useState<DocumentReference>();
	const [firstCard, setFirstCard] = useState<string | number>();
	const [boardReady, setBoardReady] = useState(false);
	const [playersPresent, setPlayersPresent] = useState({ w: false, b: false });

	const sendMove = async (move: any, fen: string, pgn: string) => {
		// console.log('sendMove', move);
		setLastMove(move);
		gameMovesRef &&
			(await updateDoc(gameMovesRef, {
				moves: arrayUnion(move),
				fen,
				pgn,
			}));
	};

	const sendFirstCard = async (card: string | number) => {
		// console.log('sendCard', card);
		gameDataRef &&
			(await updateDoc(gameDataRef, {
				firstCard: card,
			}));
	};

	const setupPlayer = useCallback(
		(updatingData: DocumentData, constantData?: DocumentData) => {
			if (!updatingData) return;

			// Determining user role and color
			let currentRole = role;
			let currentColor = color;
			let currentPlayerToken = user.uid;
			let playersArrived = {
				b: updatingData.blackArrived,
				w: updatingData.whiteArrived,
			};
			if (constantData) {
				if (!currentRole) {
					if (constantData.white === currentPlayerToken || constantData.black === currentPlayerToken) {
						currentRole = 'participant';
						if (constantData.white === currentPlayerToken) {
							currentColor = 'w';
						} else {
							currentColor = 'b';
						}
					} else if (!updatingData.whiteArrived) {
						currentRole = 'participant';
						currentColor = 'w';
						// currentPlayerToken = constantData.white;
						//TODO: add player uid to game data
					} else if (!updatingData.blackArrived) {
						currentRole = 'participant';
						currentColor = 'b';
						// currentPlayerToken = constantData.black;
						//TODO: add player uid to game data
					} else {
						currentRole = 'spectator';
					}
				}
				// if (currentRole === 'participant' && !currentColor) {

				// }
				setRole(currentRole);
				setColor(currentColor);
				// setPlayerToken(currentPlayerToken);
				// currentPlayerToken && localStorage.setItem('playerToken', currentPlayerToken);
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
			// console.log('playersArrived', playersArrived);
			setPlayersPresent(playersArrived);
			// if (playersArrived.w && playersArrived.b && updatingData.status === 'waiting') {
			// 	console.log('updating status to playing');
			// 	status = 'playing';
			// 	setGameStatusToPlaying();
			// }
			// setGameStatus(status);
		},
		[color, role, user.uid]
	);

	const setupMove = (data: DocumentData) => {
		if (!data) return;
		// setGame(data);
		if (data.fen) setFen(data.fen);
		if (data.pgn) setPgn(data.pgn);
		if (data.moves) setLastMove(data.moves[data.moves.length - 1]);
	};

	useEffect(() => {
		let unsubGameData: Unsubscribe, unsubGameMoves: Unsubscribe, unsubGameGame: Unsubscribe;

		getGame(gameId).then((gameParts) => {
			setGameDataRef(gameParts.gameDataRef);
			setGameMovesRef(gameParts.movesDataRef);
			setGameGameRef(gameParts.gameRef);
			gameParts.gameData && setupPlayer(gameParts.gameData, gameParts.game);
			gameParts.movesData && setupMove(gameParts.movesData);

			setBoardReady(true);

			if (gameParts.gameDataRef) {
				unsubGameData = onSnapshot(gameParts.gameDataRef, (dataSnap) => {
					const data = dataSnap.data();
					// console.log('Current gameData data: ', data);
					data && setupPlayer(data);
				});
			}

			if (gameParts.movesDataRef) {
				unsubGameMoves = onSnapshot(gameParts.movesDataRef, (movesSnap) => {
					const moves = movesSnap.data();
					// console.log('Current moves: ', moves);
					moves && setupMove(moves);
				});
			}

			if (gameParts.gameRef) {
				unsubGameGame = onSnapshot(gameParts.gameRef, (gameSnap) => {
					const game = gameSnap.data();
					if (game) {
						setPlayers({ w: game.white, b: game.black });
					}
				});
			}
		});
		return () => {
			// console.log('unsubscribe');
			unsubGameData && unsubGameData();
			unsubGameMoves && unsubGameMoves();
			unsubGameGame && unsubGameGame();
		};
	}, [gameId, setupPlayer]);

	const setPlayerArrived = useCallback(
		async (color: string) => {
			// console.log('setPlayerArrived', color, gameDataRef);
			if (!gameDataRef || !gameGameRef || !color) {
				// console.log('setPlayerArrived error');
				return;
			}
			try {
				let toUpdate = {
					[`${color}`]: user.uid,
				};
				// console.log('toUpdate', toUpdate);
				await updateDoc(gameGameRef, toUpdate);

				await updateDoc(gameDataRef, {
					[`${color}Arrived`]: true,
				});
			} catch (e) {
				// console.log('setPlayerArrived error', e);
			}
		},
		[gameDataRef, gameGameRef, user.uid]
	);

	const setGameStatusToPlaying = useCallback(async () => {
		// console.log('setGameStatusToPlaying');
		if (!gameDataRef) return;
		setGameStatus('playing');
		await updateDoc(gameDataRef, {
			status: 'playing',
		});
	}, [gameDataRef]);

	useEffect(() => {
		if (gameDataRef && color && role === 'participant' && gameStatus === 'waiting') {
			setPlayerArrived(color === 'w' ? 'white' : 'black');
		}
	}, [gameDataRef, color, role, gameStatus, setPlayerArrived]);

	useEffect(() => {
		// console.log('useEffect status', playersPresent, gameStatus);
		if (gameDataRef && playersPresent.w && playersPresent.b && gameStatus === 'waiting') {
			setGameStatusToPlaying();
		}
	}, [gameDataRef, playersPresent, gameStatus, setGameStatusToPlaying]);

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
					<Board fen={fen} pgn={pgn} lastMove={lastMove} color={color} role={role} sendMove={sendMove} mode='multi' sendFirstCard={sendFirstCard} firstCard={firstCard} players={players} />
				</>
			)}
			<GameChat gameId={gameId} />
		</div>
	);
}
