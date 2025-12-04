import { useState, useEffect, useCallback, useContext, useMemo } from 'react';
import { useParams } from 'react-router';
import { updateDoc, arrayUnion } from 'firebase/firestore';
import Board from '../components/Board';
import { FormattedMessage, useIntl } from 'react-intl';
import toast from 'react-hot-toast';
import { UserContext } from '../contexts/UserContext';
import GameChat from '../components/GameChat';
import ShareGame from '../components/ShareGame';
import useGameSession from '../hooks/useGameSession';

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

	const { game, gameData, moves, gameDataRef, movesRef, gameRef, loading: sessionLoading } = useGameSession(gameId);
	const [firstCard, setFirstCard] = useState<string | number>();
	const [boardReady, setBoardReady] = useState(false);

	const playersPresent = useMemo(
		() => ({
			w: !!gameData?.whiteArrived,
			b: !!gameData?.blackArrived,
		}),
		[gameData?.whiteArrived, gameData?.blackArrived]
	);
	const bothArrived = playersPresent.w && playersPresent.b;

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

	const sendMove = async (move: any, fen: string, pgn: string) => {
		const safeMove = sanitize(move);
		setLastMove(safeMove);
		if (!movesRef) return;
		await updateDoc(movesRef, {
			moves: arrayUnion(safeMove),
			fen,
			pgn,
		});
	};

	const sendFirstCard = async (card: string | number) => {
		gameDataRef &&
			(await updateDoc(gameDataRef, {
				firstCard: card,
			}));
	};

	const setupPlayer = useCallback(
		(updatingData?: GameDataDoc, constantData?: GameDoc) => {
			if (!updatingData || !constantData) return;

			let currentRole = role;
			let currentColor = color;

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

			if (updatingData.firstCard) setFirstCard(updatingData.firstCard);
		},
		[color, role, user.uid]
	);

	useEffect(() => {
		if (game) {
			setPlayers({ w: game.white ?? null, b: game.black ?? null });
		}
	}, [game]);

	useEffect(() => {
		if (moves) {
			if (moves.fen) setFen(moves.fen);
			if (moves.pgn) setPgn(moves.pgn);
			if (moves.moves?.length) setLastMove(moves.moves[moves.moves.length - 1]);
		}
	}, [moves]);

	useEffect(() => {
		if (gameData) {
			if (gameData.status) setGameStatus(gameData.status);
			setupPlayer(gameData, game);
			if (!boardReady) setBoardReady(true);
		}
	}, [gameData, game, setupPlayer, boardReady]);

	const setPlayerArrived = useCallback(
		async (color: string) => {
			if (!gameDataRef || !gameRef || !color || !user.uid) return;
			try {
				await updateDoc(gameRef, {
					[`${color}`]: user.uid,
				});
				await updateDoc(gameDataRef, {
					[`${color}Arrived`]: true,
				});
			} catch (e) { }
		},
		[gameDataRef, gameRef, user.uid]
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
