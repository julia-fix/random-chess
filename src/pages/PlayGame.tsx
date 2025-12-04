import { useState, useEffect, useCallback, useContext, useMemo } from 'react';
import { useParams } from 'react-router';
import Board from '../components/Board';
import { FormattedMessage, useIntl } from 'react-intl';
import toast from 'react-hot-toast';
import { UserContext } from '../contexts/UserContext';
import GameChat from '../components/GameChat';
import ShareGame from '../components/ShareGame';
import useGameSession from '../hooks/useGameSession';
import { updateFirstCard, updateMovesDoc, markPlayerArrived, setGameStatus } from '../services/gameService';
import { GameDataDoc, GameDoc } from '../types/game';
import PageLoading from '../components/PageLoading';

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
	const sessionError = useMemo(() => game === undefined && gameData === undefined && moves === undefined && !sessionLoading, [game, gameData, moves, sessionLoading]);

	const sendMove = async (move: any, fen: string, pgn: string) => {
		setLastMove(move);
		await updateMovesDoc(movesRef, move, fen, pgn);
	};

	const sendFirstCard = async (card: string | number) => {
		await updateFirstCard(gameDataRef, card);
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
			await markPlayerArrived(gameRef, gameDataRef, color as 'white' | 'black', user.uid);
		},
		[gameDataRef, gameRef, user.uid]
	);

	const setGameStatusToPlaying = useCallback(async () => {
		setGameStatus('playing');
		await setGameStatus(gameDataRef, 'playing');
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


	if (sessionLoading) {
		return <PageLoading />;
	}

	return (
		<div style={{ paddingTop: 20 }}>

			{sessionError && <div className='text-danger p-3'>Unable to load game session.</div>}

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
