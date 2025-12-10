import { useState, useEffect, useCallback, useContext, useMemo } from 'react';
import { useParams } from 'react-router';
import Board from '../components/Board';
import { FormattedMessage, useIntl } from 'react-intl';
import toast from 'react-hot-toast';
import { UserContext } from '../contexts/UserContext';
import GameChat from '../components/GameChat';
import ShareGame from '../components/ShareGame';
import useGameSession from '../hooks/useGameSession';
import {
	updateFirstCard,
	updateMovesDoc,
	markPlayerArrived,
	setGameStatus as setGameStatusRemote,
	updateClocksOnMove,
	finishGame,
	offerDraw,
	clearDrawOffer,
	setClocksSnapshot,
} from '../services/gameService';
import { GameDataDoc, GameDoc } from '../types/game';
import PageLoading from '../components/PageLoading';
import GameRulesModal from '../components/GameRulesModal';

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
	const [whiteTimeLeftMs, setWhiteTimeLeftMs] = useState<number>();
	const [blackTimeLeftMs, setBlackTimeLeftMs] = useState<number>();
	const [showRules, setShowRules] = useState(false);

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
	const lastMoveAtDate = useMemo(() => (gameData?.lastMoveAt && typeof (gameData.lastMoveAt as any)?.toDate === 'function' ? (gameData.lastMoveAt as any).toDate() : null), [gameData?.lastMoveAt]);

	const activeColor = useMemo(() => {
		if (lastMove && (lastMove as any).color) {
			return (lastMove as any).color === 'w' ? 'b' : 'w';
		}
		return 'w';
	}, [lastMove]);

	const getRemaining = useCallback(
		(colorKey: 'w' | 'b') => {
			const base = colorKey === 'w' ? whiteTimeLeftMs ?? 0 : blackTimeLeftMs ?? 0;
			if (gameStatus === 'finished') return base;
			if (activeColor === colorKey && lastMoveAtDate) {
				const elapsed = Date.now() - lastMoveAtDate.getTime();
				return Math.max(0, base - elapsed);
			}
			return base;
		},
		[activeColor, lastMoveAtDate, whiteTimeLeftMs, blackTimeLeftMs, gameStatus]
	);

	const [displayTick, setDisplayTick] = useState(0);

	const sendMove = async (move: any, fen: string, pgn: string) => {
		setLastMove(move);
		const movedColor = move.color as 'w' | 'b';
		const currentWhite = getRemaining('w');
		const currentBlack = getRemaining('b');
		await updateMovesDoc(movesRef, move, fen, pgn);
		await updateClocksOnMove(gameDataRef, movedColor, lastMoveAtDate, currentWhite, currentBlack);
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
			if (gameData.whiteTimeLeftMs !== undefined) setWhiteTimeLeftMs(gameData.whiteTimeLeftMs);
			if (gameData.blackTimeLeftMs !== undefined) setBlackTimeLeftMs(gameData.blackTimeLeftMs);
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
		await setGameStatusRemote(gameDataRef, 'playing');
	}, [gameDataRef]);

	useEffect(() => {
		if (gameDataRef && color && role === 'participant' && gameStatus === 'waiting' && gameData?.status !== 'finished') {
			setPlayerArrived(color === 'w' ? 'white' : 'black');
		}
	}, [gameDataRef, color, role, gameStatus, setPlayerArrived, gameData?.status]);

	useEffect(() => {
		if (gameDataRef && playersPresent.w && playersPresent.b && gameStatus === 'waiting' && gameData?.status !== 'finished') {
			setGameStatusToPlaying();
		}
	}, [gameDataRef, playersPresent, gameStatus, setGameStatusToPlaying, gameData?.status]);

	useEffect(() => {
		if (activeColor && bothArrived && gameStatus !== 'finished') {
			const id = setInterval(() => setDisplayTick((t) => t + 1), 1000);
			return () => clearInterval(id);
		}
	}, [activeColor, bothArrived, gameStatus]);

	const formatMs = (ms?: number) => {
		if (ms === undefined) return '--:--';
		const totalSeconds = Math.max(0, Math.floor(ms / 1000));
		const minutes = Math.floor(totalSeconds / 60)
			.toString()
			.padStart(2, '0');
		const seconds = (totalSeconds % 60).toString().padStart(2, '0');
		return `${minutes}:${seconds}`;
	};

	const formattedTimers = useMemo(
		() => ({
			w: formatMs(getRemaining('w')),
			b: formatMs(getRemaining('b')),
		}),
		[displayTick, getRemaining]
	);

	const drawOfferBy = useMemo(() => (gameData?.drawOffer?.by as 'w' | 'b' | undefined) || undefined, [gameData?.drawOffer?.by]);

	const handleTimeoutEnd = useCallback(
		async (timedOutColor: 'w' | 'b') => {
			if (gameStatus === 'finished') return;
			const whiteRemaining = getRemaining('w');
			const blackRemaining = getRemaining('b');
			const winner = timedOutColor === 'w' ? 'b' : 'w';
			setGameStatus('finished');
			await setClocksSnapshot(gameDataRef, whiteRemaining, blackRemaining);
			await finishGame(gameDataRef, winner, 'timeout');
		},
		[gameDataRef, gameStatus, getRemaining]
	);

	useEffect(() => {
		if (!bothArrived || gameStatus !== 'playing' || role !== 'participant') return;
		if (gameData?.winner !== undefined || gameData?.resultReason) return;
		const wLeft = getRemaining('w');
		const bLeft = getRemaining('b');
		if (wLeft <= 0 && bLeft <= 0) {
			const timedOut = activeColor || 'w';
			handleTimeoutEnd(timedOut);
		} else if (wLeft <= 0) {
			handleTimeoutEnd('w');
		} else if (bLeft <= 0) {
			handleTimeoutEnd('b');
		}
	}, [bothArrived, gameStatus, role, displayTick, getRemaining, handleTimeoutEnd, gameData?.winner, gameData?.resultReason, activeColor]);

	const handleResign = useCallback(async () => {
		if (!gameDataRef || !color) return;
		const whiteRemaining = getRemaining('w');
		const blackRemaining = getRemaining('b');
		const winner = color === 'w' ? 'b' : 'w';
		setGameStatus('finished');
		await setClocksSnapshot(gameDataRef, whiteRemaining, blackRemaining);
		await finishGame(gameDataRef, winner, 'resign');
	}, [color, gameDataRef, getRemaining]);

	const handleOfferDraw = useCallback(async () => {
		if (!gameDataRef || !color) return;
		await offerDraw(gameDataRef, color);
	}, [color, gameDataRef]);

	const handleAcceptDraw = useCallback(async () => {
		if (!gameDataRef) return;
		const whiteRemaining = getRemaining('w');
		const blackRemaining = getRemaining('b');
		setGameStatus('finished');
		await setClocksSnapshot(gameDataRef, whiteRemaining, blackRemaining);
		await finishGame(gameDataRef, null, 'agreement');
	}, [gameDataRef, getRemaining]);

	const handleDeclineDraw = useCallback(async () => {
		if (!gameDataRef) return;
		await clearDrawOffer(gameDataRef);
	}, [gameDataRef]);

	if (sessionLoading) {
		return <PageLoading />;
	}

	return (
		<div style={{ paddingTop: 20 }}>

			{sessionError && <div className='text-danger p-3'>Unable to load game session.</div>}

			{!bothArrived && (
				<div className='board-wrapper'>
					<div className='board-panel' style={{ width: '100%', maxWidth: 500, margin: '0 auto 16px' }}>
						<p><FormattedMessage id='waiting_for_opponent' /></p>
						<p><FormattedMessage id='copy_link_instructions' /></p>
						<div className='d-flex align-items-center gap-2 flex-wrap'>
							<ShareGame title={intl.formatMessage({ id: 'invite_opponent' })} url={typeof window !== 'undefined' ? window.location.href : undefined} />
						</div>
					</div>
				</div>
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
					timers={formattedTimers}
					gameStatus={gameStatus}
					winner={gameData?.winner ?? null}
					resultReason={gameData?.resultReason}
					drawOfferBy={drawOfferBy}
					moveList={moves?.moves}
					onResign={handleResign}
					onOfferDraw={handleOfferDraw}
					onAcceptDraw={handleAcceptDraw}
					onDeclineDraw={handleDeclineDraw}
					onShowRules={() => setShowRules(true)}
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
			<GameRulesModal show={showRules} onHide={() => setShowRules(false)} />
		</div>
	);
}
