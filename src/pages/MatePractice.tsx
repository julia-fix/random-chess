import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { Chess, Move } from 'chess.js';
import Board from '../components/Board';
import { drawNextCard, initialDeck } from '../utils/cardDeck';
import isValidMove from '../utils/isValidMove';
import GameRulesModal from '../components/GameRulesModal';
import { FormattedMessage, useIntl } from 'react-intl';
import { useStockfishBestMove, WORKER_HARD_TIMEOUT_MS } from '../hooks/useStockfishBestMove';

const DEFAULT_LIMIT = 5 * 60 * 1000;
const DEFAULT_SKILL = 10;
const PRACTICE_FEN = 'r1qqk2r/8/8/8/8/8/8/4K3 w - - 0 1';

const STORAGE_KEY = 'mate-practice-state';

export default function ComputerGame() {
	const chessRef = useRef(new Chess(PRACTICE_FEN));
	const deckRef = useRef(initialDeck());
	const [showRules, setShowRules] = useState(false);
	const [sessionId, setSessionId] = useState(() => Date.now());
	const intl = useIntl();

	const [fen, setFen] = useState<string>(PRACTICE_FEN);
	const [pgn, setPgn] = useState<string>(new Chess(PRACTICE_FEN).pgn());
	const [lastMove, setLastMove] = useState<any>();
	const [firstCard, setFirstCard] = useState<string | number>();
	const [whiteTimeLeftMs, setWhiteTimeLeftMs] = useState<number>(DEFAULT_LIMIT);
	const [blackTimeLeftMs, setBlackTimeLeftMs] = useState<number>(DEFAULT_LIMIT);
	const [lastMoveAt, setLastMoveAt] = useState<number>(Date.now());
	const [gameStatus, setGameStatus] = useState<'waiting' | 'playing' | 'finished'>('playing');
	const [winner, setWinner] = useState<'w' | 'b' | null>(null);
	const [resultReason, setResultReason] = useState<'timeout' | 'resign' | 'agreement' | 'stalemate' | 'checkmate' | 'insufficient' | 'other'>();
	const [movesList, setMovesList] = useState<any[]>([]);
	const [pendingBotMove, setPendingBotMove] = useState(false);
	const [skillLevel, setSkillLevel] = useState<number>(() => {
		try {
			const raw = localStorage.getItem(`${STORAGE_KEY}-skill`);
			if (raw) return parseInt(raw, 10);
		} catch {
			// ignore
		}
		return DEFAULT_SKILL;
	});

	const { getBestMove, abortActive } = useStockfishBestMove();

	// initialize first card
	useEffect(() => {
		if (firstCard !== undefined) return;
		const game = chessRef.current;
		game.reset();
		game.load(PRACTICE_FEN);
		setFen(game.fen());
		setPgn(game.pgn());
		const { card, deck } = drawNextCard(deckRef.current, game, game);
		deckRef.current = deck;
		setFirstCard(card);
		setMovesList([]);
		setLastMove(undefined);
		setWinner(null);
		setResultReason(undefined);
		setGameStatus('playing');
		setWhiteTimeLeftMs(DEFAULT_LIMIT);
		setBlackTimeLeftMs(DEFAULT_LIMIT);
		setLastMoveAt(Date.now());
	}, [firstCard]);

	const activeColor = useMemo(() => {
		if (lastMove && lastMove.color) {
			return lastMove.color === 'w' ? 'b' : 'w';
		}
		return 'w';
	}, [lastMove]);

	const getRemaining = useCallback(
		(colorKey: 'w' | 'b') => {
			return colorKey === 'w' ? whiteTimeLeftMs ?? 0 : blackTimeLeftMs ?? 0;
		},
		[whiteTimeLeftMs, blackTimeLeftMs]
	);

	const drawCardExternal = useCallback((game: Chess, gameCopy: Chess) => {
		const { card, deck } = drawNextCard(deckRef.current, game, gameCopy);
		deckRef.current = deck;
		return card;
	}, []);

	const finishGame = useCallback(
		(winColor: 'w' | 'b' | null, reason: 'timeout' | 'resign' | 'agreement' | 'stalemate' | 'checkmate' | 'insufficient' | 'other') => {
			if (gameStatus === 'finished') return;
			console.log('[end] finishGame called', { winColor, reason });
			setWinner(winColor);
			setResultReason(reason);
			setGameStatus('finished');
		},
		[gameStatus]
	);

	const syncFromFen = useCallback(
		(newFen: string) => {
			const game = chessRef.current;
			game.load(newFen);
			setFen(game.fen());
			setPgn(game.pgn());
		},
		[]
	);

	const handleGameEndState = useCallback(
		(moveColor: 'w' | 'b', fenAfter: string) => {
			const game = new Chess(fenAfter);
			if (game.isCheckmate()) {
				console.log('[end] checkmate detected', { moveColor, fenAfter });
				finishGame(moveColor, 'checkmate');
				return true;
			}
			if (game.isInsufficientMaterial()) {
				console.log('[end] insufficient material', { fenAfter });
				finishGame(null, 'insufficient');
				return true;
			}
			if (game.isStalemate()) {
				console.log('[end] stalemate detected', { fenAfter });
				finishGame(null, 'stalemate');
				return true;
			}
			return false;
		},
		[finishGame]
	);

	const handlePlayerMove = useCallback(
		(move: any, newFen: string, newPgn: string) => {
			const game = chessRef.current;
			game.load(newFen);
			const currentWhite = getRemaining('w');
			const currentBlack = getRemaining('b');
			setWhiteTimeLeftMs(currentWhite);
			setBlackTimeLeftMs(currentBlack);
			setLastMove(move);
			setFen(newFen);
			setPgn(newPgn);
			setMovesList((prev) => [...prev, move]);
			setLastMoveAt(Date.now());
			const ended = handleGameEndState('w', newFen);
			if (!ended) setPendingBotMove(true);
		},
		[getRemaining, handleGameEndState]
	);

	const botMove = useCallback(
		async (card: string | number) => {
			const game = chessRef.current;
			const legalMoves = game.moves({ verbose: true }) as Move[];
			const cardMoves = legalMoves.filter((m) => isValidMove(m, card, game));
			console.log('[bot] evaluating moves', { card, legal: legalMoves.length, cardMoves: cardMoves.length, fen: game.fen() });
			if (!cardMoves.length) {
				if (game.isCheck()) {
					finishGame('w', 'checkmate');
				} else {
					finishGame(null, 'stalemate');
				}
				return;
			}
			const searchMoves = cardMoves.map((m) => `${m.from}${m.to}${m.promotion ?? ''}`);
			let bestUci: string | null = null;
			let timeoutHandle: ReturnType<typeof setTimeout> | null = null;
			let timedOut = false;
			try {
				timeoutHandle = setTimeout(() => {
					console.warn('[stockfish] bot move timed out waiting for engine, using fallback');
					timedOut = true;
					abortActive('bot-move-timeout');
				}, WORKER_HARD_TIMEOUT_MS + 1000);
				bestUci = await getBestMove({ fen: game.fen(), searchMoves, skill: skillLevel, depth: 8 });
			} catch (err) {
				// Fallback to a legal move if the engine misbehaves.
				console.error('Stockfish failed to respond, using fallback move', err);
				abortActive('bot-move-error');
			} finally {
				if (timeoutHandle) clearTimeout(timeoutHandle);
			}
			const chosen = cardMoves.find((m) => `${m.from}${m.to}${m.promotion ?? ''}` === bestUci) ?? cardMoves[0];
			if (!bestUci) {
				console.log('Stockfish returned no move, choosing first legal card move as fallback', chosen);
			} else if (timedOut) {
				console.log('Stockfish delivered a move after timeout; move kept but worker aborted earlier');
			}
			console.log('[bot] applying move', { bestUci, chosen, card, timedOut });
			const moveResult = game.move({ from: chosen.from, to: chosen.to, promotion: chosen.promotion });
			if (!moveResult) {
				console.error('[bot] failed to apply move, using first legal move hard fallback', chosen);
				const fallback = cardMoves[0];
				game.move({ from: fallback.from, to: fallback.to, promotion: fallback.promotion });
			}
			const fenAfterMove = game.fen();
			console.log('[bot] move applied to game', { fenAfterMove, pgnAfter: game.pgn() });
			const newFen = game.fen();
			const moveIndex = movesList.length + 1;
			const currentWhite = getRemaining('w');
			const currentBlack = getRemaining('b');
			const currentGame = chessRef.current;
			// Check end states before drawing next card to avoid extra steps after mate/stalemate.
			if (currentGame.isCheckmate()) {
				console.log('[bot] checkmate detected on board after move');
				const movePayload = { ...chosen, card, moveIndex, color: 'b', nextCard: undefined };
				setMovesList((prev) => [...prev, movePayload]);
				setLastMove(movePayload);
				setFen(newFen);
				setPgn(game.pgn());
				setWhiteTimeLeftMs(currentWhite);
				setBlackTimeLeftMs(currentBlack);
				setLastMoveAt(Date.now());
				finishGame('b', 'checkmate');
				abortActive('bot-game-ended');
				return;
			}
			if (currentGame.isStalemate()) {
				console.log('[bot] stalemate detected on board after move');
				const movePayload = { ...chosen, card, moveIndex, color: 'b', nextCard: undefined };
				setMovesList((prev) => [...prev, movePayload]);
				setLastMove(movePayload);
				setFen(newFen);
				setPgn(game.pgn());
				setWhiteTimeLeftMs(currentWhite);
				setBlackTimeLeftMs(currentBlack);
				setLastMoveAt(Date.now());
				finishGame(null, 'stalemate');
				abortActive('bot-game-ended');
				return;
			}
			if (currentGame.isInsufficientMaterial()) {
				console.log('[bot] insufficient material detected on board after move');
				const movePayload = { ...chosen, card, moveIndex, color: 'b', nextCard: undefined };
				setMovesList((prev) => [...prev, movePayload]);
				setLastMove(movePayload);
				setFen(newFen);
				setPgn(game.pgn());
				setWhiteTimeLeftMs(currentWhite);
				setBlackTimeLeftMs(currentBlack);
				setLastMoveAt(Date.now());
				finishGame(null, 'insufficient');
				abortActive('bot-game-ended');
				return;
			}
			const nextCard = drawCardExternal(game, game);
			const movePayload = {
				...chosen,
				card,
				nextCard,
				moveIndex,
				color: 'b',
			};
			setMovesList((prev) => [...prev, movePayload]);
			setLastMove(movePayload);
			console.log('[bot] payload set', { movePayload, nextCard, newFen });
			setFen(newFen);
			setPgn(game.pgn());
			setWhiteTimeLeftMs(currentWhite);
			setBlackTimeLeftMs(currentBlack);
			setLastMoveAt(Date.now());
			console.log('[bot] applied move', { move: movePayload, fenAfter: newFen, timers: { w: currentWhite, b: currentBlack } });
		},
		[abortActive, drawCardExternal, finishGame, getBestMove, getRemaining, movesList.length]
	);

	// Kill any running engine when the game ends to prevent stray workers on checkmate/stalemate.
	useEffect(() => {
		if (gameStatus === 'finished') {
			abortActive('game-finished');
			setPendingBotMove(false);
			setSessionId(Date.now()); // force board to refresh final state
		}
	}, [gameStatus, abortActive]);

	// If it's White's turn and the current card yields no legal moves, end the game to avoid freezes.
	useEffect(() => {
		if (gameStatus !== 'playing') return;
		const game = chessRef.current;
		if (game.turn() !== 'w') return;
		const currentCard = lastMove?.nextCard ?? firstCard;
		if (currentCard === undefined) return;
		const legalMoves = game.moves({ verbose: true }) as Move[];
		const cardMoves = legalMoves.filter((m) => isValidMove(m, currentCard, game));
		if (!cardMoves.length) {
			if (game.isCheck()) {
				finishGame('b', 'checkmate');
			} else {
				finishGame(null, 'stalemate');
			}
		}
	}, [firstCard, gameStatus, lastMove, finishGame]);

	useEffect(() => {
		if (!pendingBotMove || gameStatus !== 'playing') return;
		setPendingBotMove(false);
		const cardForBot = lastMove?.nextCard;
		if (cardForBot !== undefined) {
			// setTimeout(() => botMove(cardForBot), 1500);
			botMove(cardForBot);
		}
	}, [pendingBotMove, gameStatus, lastMove, botMove]);

	return (
		<div style={{ paddingTop: 20 }}>
			<Board
				mode='multi'
				role='participant'
				color='w'
				fen={fen}
				pgn={gameStatus === 'finished' ? undefined : pgn}
				key={sessionId}
				lastMove={lastMove}
				firstCard={firstCard}
				sendFirstCard={(card) => setFirstCard(card)}
				sendMove={handlePlayerMove}
				gameStatus={gameStatus}
				winner={winner}
				resultReason={resultReason}
				moveList={movesList}
				drawNextCardExternal={drawCardExternal}
				playerLabels={{ w: intl.formatMessage({ id: 'player.you', defaultMessage: 'Player' }), b: intl.formatMessage({ id: 'player.computer', defaultMessage: 'Computer' }) }}
				topControls={
					<div className='d-flex align-items-center gap-2 flex-wrap ms-auto'>
						<select
							className='form-select form-select-sm'
							style={{ width: 140 }}
							value={skillLevel}
							onChange={(e) => setSkillLevel(parseInt(e.target.value, 10))}
						>
							<option value={2}>{intl.formatMessage({ id: 'skill.very_easy', defaultMessage: 'Very Easy' })}</option>
							<option value={5}>{intl.formatMessage({ id: 'skill.easy', defaultMessage: 'Easy' })}</option>
							<option value={10}>{intl.formatMessage({ id: 'skill.medium', defaultMessage: 'Medium' })}</option>
							<option value={15}>{intl.formatMessage({ id: 'skill.hard', defaultMessage: 'Hard' })}</option>
							<option value={20}>{intl.formatMessage({ id: 'skill.max', defaultMessage: 'Max' })}</option>
						</select>
					</div>
				}
				onShowRules={() => setShowRules(true)}
				onNewGame={() => {
					localStorage.removeItem(STORAGE_KEY);
					chessRef.current = new Chess(PRACTICE_FEN);
					deckRef.current = initialDeck();
					setFen(PRACTICE_FEN);
					setPgn(new Chess(PRACTICE_FEN).pgn());
					setLastMove(undefined);
					setFirstCard(undefined);
					setMovesList([]);
					setWinner(null);
					setResultReason(undefined);
					setGameStatus('playing');
					setWhiteTimeLeftMs(DEFAULT_LIMIT);
					setBlackTimeLeftMs(DEFAULT_LIMIT);
					setLastMoveAt(Date.now());
					setPendingBotMove(false);
				}}
				onResign={() => finishGame('b', 'resign')}
			/>
			<GameRulesModal show={showRules} onHide={() => setShowRules(false)} />
		</div>
	);
}
