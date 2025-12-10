import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
// Use a concrete Stockfish worker build; import as URL so Vite serves it correctly.
// eslint-disable-next-line import/no-relative-packages
import stockfishWorkerUrl from 'stockfish/src/stockfish-17.1-lite-single-03e3232.js?url';
import { Chess, Move } from 'chess.js';
import Board from '../components/Board';
import { drawNextCard, initialDeck } from '../utils/cardDeck';
import isValidMove from '../utils/isValidMove';
import GameRulesModal from '../components/GameRulesModal';
import { FormattedMessage, useIntl } from 'react-intl';

type BestMoveRequest = {
	fen: string;
	searchMoves: string[];
	depth?: number;
	skill?: number;
};

function useStockfishBestMove() {
	const getBestMove = useCallback(async ({ fen, searchMoves, depth = 8, skill }: BestMoveRequest) => {
		if (!searchMoves.length) return null;
		return new Promise<string>((resolve) => {
			const engine = new Worker(stockfishWorkerUrl);
			let ready = false;
			const timeout = setTimeout(() => {
				engine.terminate();
				resolve(null);
			}, 5000);
			engine.onmessage = (event: MessageEvent) => {
				const text = typeof event.data === 'string' ? event.data : '';
				if (!text) return;
				if (text.includes('readyok')) {
					ready = true;
					if (skill !== undefined) {
						engine.postMessage(`setoption name Skill Level value ${skill}`);
					}
					engine.postMessage('ucinewgame');
					engine.postMessage(`position fen ${fen}`);
					engine.postMessage(`go depth ${depth} searchmoves ${searchMoves.join(' ')}`);
				}
				if (text.startsWith('bestmove')) {
					const parts = text.split(' ');
					const best = parts[1];
					engine.postMessage('quit');
					engine.terminate();
					clearTimeout(timeout);
					if (best === '(none)' || best === '0000' || !best) {
						resolve(null);
						return;
					}
					resolve(best);
				}
			};
			engine.postMessage('uci');
			engine.postMessage('isready');
			setTimeout(() => {
				if (!ready) {
					engine.postMessage(`position fen ${fen}`);
					engine.postMessage(`go depth ${depth} searchmoves ${searchMoves.join(' ')}`);
				}
			}, 100);
		});
	}, []);

	return { getBestMove };
}

const DEFAULT_LIMIT = 5 * 60 * 1000;
const DEFAULT_SKILL = 10;

const STORAGE_KEY = 'computer-game-state';

export default function ComputerGame() {
	const chessRef = useRef(new Chess());
	const deckRef = useRef(initialDeck());
	const [sessionId, setSessionId] = useState<number>(() => Date.now());
	const [showRules, setShowRules] = useState(false);
	const intl = useIntl();

	const [fen, setFen] = useState<string>();
	const [pgn, setPgn] = useState<string>();
	const [lastMove, setLastMove] = useState<any>();
	const [firstCard, setFirstCard] = useState<string | number>();
	const [whiteTimeLeftMs, setWhiteTimeLeftMs] = useState<number>(DEFAULT_LIMIT);
	const [blackTimeLeftMs, setBlackTimeLeftMs] = useState<number>(DEFAULT_LIMIT);
	const [lastMoveAt, setLastMoveAt] = useState<number>(Date.now());
	const [gameStatus, setGameStatus] = useState<'waiting' | 'playing' | 'finished'>('playing');
	const [winner, setWinner] = useState<'w' | 'b' | null>(null);
	const [resultReason, setResultReason] = useState<'timeout' | 'resign' | 'agreement' | 'stalemate' | 'checkmate' | 'other'>();
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

	const { getBestMove } = useStockfishBestMove();

	// initialize first card
	useEffect(() => {
		if (firstCard !== undefined) return;
		const saved = (() => {
			try {
				const raw = localStorage.getItem(STORAGE_KEY);
				return raw ? JSON.parse(raw) : null;
			} catch {
				return null;
			}
		})();
		if (saved && saved.fen) {
			const game = chessRef.current;
			try {
				game.reset();
				game.load(saved.fen);
				setFen(game.fen());
				setPgn(saved.pgn);
				setMovesList(saved.movesList || []);
				setLastMove(saved.lastMove);
				setFirstCard(saved.firstCard);
				setWinner(saved.winner ?? null);
				setResultReason(saved.resultReason);
				setGameStatus(saved.gameStatus || 'playing');
				if (saved.deckRemaining) {
					deckRef.current = { remaining: saved.deckRemaining };
				}
				setWhiteTimeLeftMs(saved.whiteTimeLeftMs ?? DEFAULT_LIMIT);
				setBlackTimeLeftMs(saved.blackTimeLeftMs ?? DEFAULT_LIMIT);
				if (saved.lastMoveAt) {
					setLastMoveAt(saved.lastMoveAt);
					const now = Date.now();
					const elapsed = now - saved.lastMoveAt;
					if (saved.gameStatus === 'playing') {
						if (saved.activeColor === 'w') {
							setWhiteTimeLeftMs(Math.max(0, (saved.whiteTimeLeftMs ?? DEFAULT_LIMIT) - elapsed));
						} else if (saved.activeColor === 'b') {
							setBlackTimeLeftMs(Math.max(0, (saved.blackTimeLeftMs ?? DEFAULT_LIMIT) - elapsed));
						}
					}
				}
				if (saved.skillLevel !== undefined) {
					setSkillLevel(saved.skillLevel);
				}
				return;
			} catch {
				// fallback to fresh start
			}
		}
		const game = chessRef.current;
		const { card, deck } = drawNextCard(deckRef.current, game, game);
		deckRef.current = deck;
		setFirstCard(card);
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
		(winColor: 'w' | 'b' | null, reason: 'timeout' | 'resign' | 'agreement' | 'stalemate' | 'checkmate' | 'other') => {
			if (gameStatus === 'finished') return;
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
				finishGame(moveColor, 'checkmate');
				return true;
			}
			if (game.isStalemate()) {
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
			if (!cardMoves.length) {
				if (game.isCheck()) {
					finishGame('w', 'checkmate');
				} else {
					finishGame(null, 'stalemate');
				}
				return;
			}
			const searchMoves = cardMoves.map((m) => `${m.from}${m.to}${m.promotion ?? ''}`);
			const bestUci = await getBestMove({ fen: game.fen(), searchMoves, skill: skillLevel, depth: 8 });
			const chosen = cardMoves.find((m) => `${m.from}${m.to}${m.promotion ?? ''}` === bestUci) ?? cardMoves[0];
			game.move({ from: chosen.from, to: chosen.to, promotion: chosen.promotion });
			const nextCard = drawCardExternal(game, game);
			const moveIndex = movesList.length + 1;
			const movePayload = {
				...chosen,
				card,
				nextCard,
				moveIndex,
				color: 'b',
			};
			setMovesList((prev) => [...prev, movePayload]);
			setLastMove(movePayload);
			setFen(game.fen());
			setPgn(game.pgn());
			const currentWhite = getRemaining('w');
			const currentBlack = getRemaining('b');
			setWhiteTimeLeftMs(currentWhite);
			setBlackTimeLeftMs(currentBlack);
			setLastMoveAt(Date.now());
			handleGameEndState('b', game.fen());
		},
		[drawCardExternal, finishGame, getBestMove, getRemaining, handleGameEndState, movesList.length]
	);

	// persist to localStorage
	useEffect(() => {
		try {
			const payload = {
				fen,
				pgn,
				movesList,
				lastMove,
				firstCard,
				winner,
				resultReason,
				gameStatus,
				deckRemaining: deckRef.current.remaining,
				whiteTimeLeftMs,
				blackTimeLeftMs,
				lastMoveAt,
				activeColor,
				skillLevel,
			};
			localStorage.setItem(STORAGE_KEY, JSON.stringify(payload));
			localStorage.setItem(`${STORAGE_KEY}-skill`, String(skillLevel));
		} catch {
			// ignore persistence errors
		}
	}, [fen, pgn, movesList, lastMove, firstCard, winner, resultReason, gameStatus, whiteTimeLeftMs, blackTimeLeftMs, lastMoveAt, activeColor, skillLevel]);

	useEffect(() => {
		if (!pendingBotMove || gameStatus !== 'playing') return;
		setPendingBotMove(false);
		const cardForBot = lastMove?.nextCard;
		if (cardForBot !== undefined) {
			setTimeout(() => botMove(cardForBot), 1500);
		}
	}, [pendingBotMove, gameStatus, lastMove, botMove]);

	return (
		<div style={{ paddingTop: 20 }}>
			<Board
				mode='multi'
				role='participant'
				color='w'
				fen={fen}
				pgn={pgn}
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
				key={sessionId}
				onNewGame={() => {
					localStorage.removeItem(STORAGE_KEY);
					chessRef.current = new Chess();
					deckRef.current = initialDeck();
					setFen(undefined);
					setPgn(undefined);
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
					setSessionId(Date.now());
				}}
				onResign={() => finishGame('b', 'resign')}
			/>
			<GameRulesModal show={showRules} onHide={() => setShowRules(false)} />
		</div>
	);
}
