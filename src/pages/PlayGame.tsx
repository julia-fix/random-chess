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
	updatePlayerLastActive,
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
	const [localLastMoveAtMs, setLocalLastMoveAtMs] = useState<number | null>(null);
	const ACTIVE_PING_MS = 30000;

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
	const effectiveLastMoveAt = useMemo(() => (localLastMoveAtMs ? new Date(localLastMoveAtMs) : lastMoveAtDate), [lastMoveAtDate, localLastMoveAtMs]);

	useEffect(() => {
		// Clear local override when fresh server timestamp arrives
		setLocalLastMoveAtMs(null);
	}, [lastMoveAtDate?.getTime()]);

	useEffect(() => {
		if (!gameDataRef || role !== 'participant' || !color) return;
		if (typeof document === 'undefined') return;

		let intervalId: ReturnType<typeof setInterval> | undefined;

		const ping = () => updatePlayerLastActive(gameDataRef, color);

		const handleVisibility = () => {
			if (document.visibilityState === 'visible') {
				ping();
				if (!intervalId) {
					intervalId = setInterval(ping, ACTIVE_PING_MS);
				}
			} else if (intervalId) {
				clearInterval(intervalId);
				intervalId = undefined;
			}
		};

		handleVisibility();
		document.addEventListener('visibilitychange', handleVisibility);
		window.addEventListener('focus', handleVisibility);

		return () => {
			if (intervalId) clearInterval(intervalId);
			document.removeEventListener('visibilitychange', handleVisibility);
			window.removeEventListener('focus', handleVisibility);
		};
	}, [gameDataRef, role, color]);

	const activeColor = useMemo(() => {
		if (lastMove && (lastMove as any).color) {
			return (lastMove as any).color === 'w' ? 'b' : 'w';
		}
		return 'w';
	}, [lastMove]);

	const hasMoved = useMemo(
		() => ({
			w: !!moves?.moves?.some((m) => m.color === 'w'),
			b: !!moves?.moves?.some((m) => m.color === 'b'),
		}),
		[moves?.moves]
	);

	const getRemaining = useCallback(
		(colorKey: 'w' | 'b') => {
			const base = colorKey === 'w' ? whiteTimeLeftMs ?? 0 : blackTimeLeftMs ?? 0;
			if (gameStatus === 'finished') return base;
			const waitingForFirstMove = !hasMoved[colorKey];
			if (activeColor === colorKey && effectiveLastMoveAt && !waitingForFirstMove) {
				const elapsed = Date.now() - effectiveLastMoveAt.getTime();
				return Math.max(0, base - elapsed);
			}
			return base;
		},
		[activeColor, effectiveLastMoveAt, whiteTimeLeftMs, blackTimeLeftMs, gameStatus, hasMoved]
	);

	const [displayTick, setDisplayTick] = useState(0);

	const sendMove = async (move: any, fen: string, pgn: string) => {
		setLastMove(move);
		const movedColor = move.color as 'w' | 'b';
		const nowMs = Date.now();
		setLocalLastMoveAtMs(nowMs);
		const currentWhite = getRemaining('w');
		const currentBlack = getRemaining('b');
		const hasMovedBefore = hasMoved[movedColor];
		const lastAt = new Date(nowMs);
		await updateMovesDoc(movesRef, move, fen, pgn, gameId);
		await updateClocksOnMove(gameDataRef, movedColor, lastAt, currentWhite, currentBlack, !hasMovedBefore);
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
			await markPlayerArrived(gameRef, gameDataRef, color as 'white' | 'black', user.uid, user.displayName);
		},
		[gameDataRef, gameRef, user.displayName, user.uid]
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
	const unreadCount = useMemo(() => {
		if (!user.uid) return 0;
		return gameData?.unreadByUid?.[user.uid] ?? 0;
	}, [gameData?.unreadByUid, user.uid]);
	const playerLabels = useMemo(
		() => ({
			w: intl.formatMessage({ id: 'player.white', defaultMessage: 'White' }),
			b: intl.formatMessage({ id: 'player.black', defaultMessage: 'Black' }),
		}),
		[intl]
	);

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

	const handleJoinSeat = useCallback(
		async (seat: 'w' | 'b') => {
			if (!gameRef || !gameDataRef) return;
			if (role === 'participant') return;
			if (gameStatus === 'finished') return;
			if (players?.[seat]) return;
			setRole('participant');
			setColor(seat);
			await markPlayerArrived(gameRef, gameDataRef, seat === 'w' ? 'white' : 'black', user.uid, user.displayName);
		},
		[gameRef, gameDataRef, role, gameStatus, players, user.uid, user.displayName]
	);

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
					onJoinSeat={handleJoinSeat}
					playerLabels={playerLabels}
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

			{role === 'participant' && (
				<GameChat
					gameId={gameId}
					gameDataRef={gameDataRef}
					players={players}
					unreadCount={unreadCount}
				/>
			)}
			<GameRulesModal show={showRules} onHide={() => setShowRules(false)} />
		</div>
	);
}
