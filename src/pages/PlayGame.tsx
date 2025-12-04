import { useState, useEffect, useCallback, useContext } from 'react';
import { useParams } from 'react-router';
import { updateDoc, DocumentData, onSnapshot, Unsubscribe, DocumentReference, arrayUnion } from 'firebase/firestore';
import Board from '../components/Board';
import getGame from '../utils/getGame';
import { FormattedMessage, useIntl } from 'react-intl';
import toast from 'react-hot-toast';
import { UserContext } from '../contexts/UserContext';
import GameChat from '../components/GameChat';
import ShareGame from '../components/ShareGame';

export default function PlayGame() {
	const user = useContext(UserContext);
	const [gameId] = useState<string>(useParams<{ gameId: string }>().gameId || '');

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
	const bothArrived = playersPresent.w && playersPresent.b;

	const sendMove = async (move: any, fen: string, pgn: string) => {
		setLastMove(move);
		gameMovesRef &&
			(await updateDoc(gameMovesRef, {
				moves: arrayUnion(move),
				fen,
				pgn,
			}));
	};

	const sendFirstCard = async (card: string | number) => {
		gameDataRef &&
			(await updateDoc(gameDataRef, {
				firstCard: card,
			}));
	};

	const setupPlayer = useCallback(
		(updatingData: DocumentData, constantData?: DocumentData) => {
			if (!updatingData) return;

			let currentRole = role;
			let currentColor = color;
			let playersArrived = {
				b: !!updatingData.blackArrived,
				w: !!updatingData.whiteArrived,
			};

			if (constantData) {
				if (!currentRole) {
					if (constantData.white === user.uid || constantData.black === user.uid) {
						currentRole = 'participant';
						currentColor = constantData.white === user.uid ? 'w' : 'b';
					} else if (!updatingData.whiteArrived) {
						currentRole = 'participant';
						currentColor = 'w';
					} else if (!updatingData.blackArrived) {
						currentRole = 'participant';
						currentColor = 'b';
					} else {
						currentRole = 'spectator';
					}
				}

				setRole(currentRole);
				setColor(currentColor);
			}

			if (updatingData.firstCard) setFirstCard(updatingData.firstCard);
			setPlayersPresent(playersArrived);
		},
		[color, role, user.uid]
	);

	const setupMove = (data: DocumentData) => {
		if (!data) return;
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
				unsubGameData = onSnapshot(gameParts.gameDataRef, (snap) => {
					const data = snap.data();
					data && setupPlayer(data);
				});
			}

			if (gameParts.movesDataRef) {
				unsubGameMoves = onSnapshot(gameParts.movesDataRef, (snap) => {
					const moves = snap.data();
					moves && setupMove(moves);
				});
			}

			if (gameParts.gameRef) {
				unsubGameGame = onSnapshot(gameParts.gameRef, (snap) => {
					const game = snap.data();
					if (game) {
						setPlayers({ w: game.white, b: game.black });
					}
				});
			}
		});

		return () => {
			unsubGameData && unsubGameData();
			unsubGameMoves && unsubGameMoves();
			unsubGameGame && unsubGameGame();
		};
	}, [gameId, setupPlayer]);

	const setPlayerArrived = useCallback(
		async (color: string) => {
			if (!gameDataRef || !gameGameRef || !color) return;
			try {
				await updateDoc(gameGameRef, {
					[`${color}`]: user.uid,
				});
				await updateDoc(gameDataRef, {
					[`${color}Arrived`]: true,
				});
			} catch (e) { }
		},
		[gameDataRef, gameGameRef, user.uid]
	);

	const setGameStatusToPlaying = useCallback(async () => {
		if (!gameDataRef) return;
		setGameStatus('playing');
		await updateDoc(gameDataRef, { status: 'playing' });
	}, [gameDataRef]);

	useEffect(() => {
		if (gameDataRef && color && role === 'participant' && gameStatus === 'waiting') {
			setPlayerArrived(color === 'w' ? 'white' : 'black');
		}
	}, [gameDataRef, color, role, gameStatus, setPlayerArrived]);

	useEffect(() => {
		if (gameDataRef && playersPresent.w && playersPresent.b && gameStatus === 'waiting') {
			setGameStatusToPlaying();
		}
	}, [gameDataRef, playersPresent, gameStatus, setGameStatusToPlaying]);


	return (
		<div style={{ paddingTop: 20 }}>


			{!bothArrived && (
				<div>
					<p><FormattedMessage id='waiting_for_opponent' /></p>
					<p><FormattedMessage id='copy_link_instructions' /></p>
					<div style={{ marginBottom: 16 }}>
						<ShareGame title={intl.formatMessage({ id: 'invite_opponent' })} />
					</div>

				</div>
			)}
			{bothArrived && (
				<div><p>Both arrived</p></div>
			)}

			{boardReady && (
				<Board
					fen={fen}
					pgn={pgn}
					lastMove={lastMove}
					color={color}
					role={role}
					sendMove={sendMove}
					mode='multi'
					sendFirstCard={sendFirstCard}
					firstCard={firstCard}
					players={players}
					shareControl={
						bothArrived ? (
							<ShareGame
								title={intl.formatMessage({ id: 'invite_opponent' })}
								url={typeof window !== 'undefined' ? window.location.href : undefined}
								compact
							/>
						) : undefined
					}
				/>
			)}

			<GameChat gameId={gameId} />
		</div>
	);
}
