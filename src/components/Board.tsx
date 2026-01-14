import { Chessboard } from 'react-chessboard';
import { Chess, Square } from 'chess.js';
import { useState, useEffect, useRef, useCallback, useMemo } from 'react';
import { Badge } from 'react-bootstrap';
import { FormattedMessage, useIntl } from 'react-intl';
import { promotionModal } from '../components/promotionModal';
import { Container as ModalContainer } from 'react-modal-promise';
import { pieces } from '../utils/cardsList';
import checkMove from '../utils/checkMove';
import checkMovePossibility from '../utils/checkMovePossibility';
import isValidMove from '../utils/isValidMove';
import LangLink from './LangLink';
import PlayerInfo from './PlayerInfo';
import Moves from './Moves';
import useBoardSize from '../hooks/useBoardSize';
import useCardDeck from '../hooks/useCardDeck';

type PromotionType = 'b' | 'n' | 'r' | 'q' | undefined;
type ShortMove = {
	from: string;
	to: string;
	promotion?: string;
};

interface SquareStyle {
	background: string;
	borderRadius?: string;
}
interface NewSquare {
	[key: string]: SquareStyle;
}

type Props = {
	fen?: string;
	pgn?: string;
	startFen?: string;
	color?: 'w' | 'b';
	role?: string;
	timers?: { w?: string; b?: string };
	gameStatus?: 'waiting' | 'playing' | 'finished';
	winner?: 'w' | 'b' | null;
	resultReason?: 'timeout' | 'resign' | 'agreement' | 'stalemate' | 'checkmate' | 'insufficient' | 'other';
	drawOfferBy?: 'w' | 'b';
	onResign?: () => void;
	onOfferDraw?: () => void;
	onAcceptDraw?: () => void;
	onDeclineDraw?: () => void;
	onJoinSeat?: (color: 'w' | 'b') => void;
	moveList?: any[];
	drawNextCardExternal?: (game: Chess, gameCopy: Chess) => string | number;
	onNewGame?: () => void;
	topControls?: React.ReactNode;
	onShowRules?: () => void;
	sendMove?: (move: any, fen: string, pgn: string) => void;
	sendFirstCard?: (card: any) => void;
	mode: 'single' | 'multi';
	lastMove?: any;
	firstCard?: string | number;
	players?: { w: string | null; b: string | null };
	playerLabels?: { w: string; b: string };
	shareControl?: React.ReactNode;
};

function Board({
	fen,
	pgn,
	startFen,
	role,
	color,
	sendMove,
	mode,
	lastMove,
	sendFirstCard,
	firstCard,
	players,
	shareControl,
	timers,
	gameStatus,
	winner,
	resultReason,
	drawOfferBy,
	onResign,
	onAcceptDraw,
	onDeclineDraw,
	onOfferDraw,
	onJoinSeat,
	moveList,
	drawNextCardExternal,
	onNewGame,
	topControls,
	onShowRules,
	playerLabels,
}: Props) {
	// const [game] = useState<ChessInstance>(new Chess('8/1P1P1P1P/8/1K6/6k1/8/p1p1p1p1/8 w KQkq - 0 1'));
	// const [gameCopy] = useState<ChessInstance>(new Chess('8/1P1P1P1P/8/1K6/6k1/8/p1p1p1p1/8 w KQkq - 0 1'));
	const gameRef = useRef<Chess>(new Chess());
	const gameCopyRef = useRef<Chess>(new Chess());
	const game = gameRef.current;
	const gameCopy = gameCopyRef.current;
	const [moveFrom, setMoveFrom] = useState('');
	const [turn, setTurn] = useState<string>('w');
	const boardContainerRef = useRef<HTMLDivElement>(null);
	const [result, setResult] = useState<string>('game_going');
	const [knownLastMove, setKnownLastMove] = useState<any>();
	const [inited, setInited] = useState(false);
	const cardInitRef = useRef(false);
	const loadedFenRef = useRef<string | undefined>(undefined);
	const loadedPgnRef = useRef<string | undefined>(undefined);
	const boardWidth = useBoardSize(boardContainerRef);
	const { card, setCard, drawCard, resetDeck, revertCard, cardsHistory } = useCardDeck(mode, game, gameCopy);
	const [optionSquares, setOptionSquares] = useState({});
	const [showResignConfirm, setShowResignConfirm] = useState(false);
	const [displayFen, setDisplayFen] = useState<string | null>(null);
	const [viewPly, setViewPly] = useState<number | null>(null);
	const [isFlipped, setIsFlipped] = useState(false);
	const drawCardFn = useCallback(() => (drawNextCardExternal ? drawNextCardExternal(game, gameCopy) : drawCard()), [drawCard, drawNextCardExternal, game, gameCopy]);

	const getAllowedMoves = useCallback(
		(square: Square) => {
			const moves = gameCopy.moves({
				square,
				verbose: true,
			});
			if (!card && card !== 0) return [];
			return moves.filter((move) => isValidMove(move, card, gameCopy));
		},
		[card, gameCopy]
	);

	const opponentMove = useCallback(
		(receivedMove: any) => {
			const toMove: ShortMove = {
				from: receivedMove.from,
				to: receivedMove.to,
				promotion: receivedMove.promotion,
			};
			const move = game.move(toMove);
			if (move) {
				gameCopy.move(toMove);
				setCard(receivedMove.nextCard);
			}

			if (game.isGameOver()) {
				setResult('game_over');
			} else {
				setTurn(game.turn());
			}
		},
		[game, gameCopy]
	);

	useEffect(() => {
		const fenChanged = fen && fen !== loadedFenRef.current;
		const pgnChanged = pgn && pgn !== loadedPgnRef.current;
		if (!inited || fenChanged || pgnChanged) {
			try {
				game.reset();
				gameCopy.reset();
				if (pgn) {
					game.loadPgn(pgn);
					gameCopy.loadPgn(pgn);
					loadedPgnRef.current = pgn;
					loadedFenRef.current = game.fen();
				} else if (fen) {
					game.load(fen);
					gameCopy.load(fen);
					loadedFenRef.current = fen;
					loadedPgnRef.current = undefined;
				}
			} catch (e) {
				game.reset();
				gameCopy.reset();
				loadedFenRef.current = undefined;
				loadedPgnRef.current = undefined;
				console.warn('Invalid FEN/PGN provided, resetting game.', e);
			}

			if (mode === 'single' && !cardInitRef.current) {
				drawCardFn();
				cardInitRef.current = true;
			} else if (mode === 'multi') {
				if (lastMove) {
					setCard(lastMove.nextCard);
				} else if (color === 'w' && !firstCard) {
					const newCard = drawCardFn();
					sendFirstCard && sendFirstCard(newCard);
				}
			}
			setTurn(game.turn());
			setInited(true);
		}
	}, [color, fen, pgn, mode, lastMove, firstCard, sendFirstCard, gameCopy, game, drawCard, inited, setCard]);

	// Ensure first card is drawn when white seat is claimed after initial load
	useEffect(() => {
		if (mode === 'multi' && color === 'w' && !firstCard && !lastMove && !cardInitRef.current) {
			const newCard = drawCardFn();
			setCard(newCard);
			sendFirstCard && sendFirstCard(newCard);
			cardInitRef.current = true;
		}
	}, [mode, color, firstCard, lastMove, drawCardFn, sendFirstCard, setCard]);

	useEffect(() => {
		if (!lastMove) {
			if (firstCard && !card) setCard(firstCard);
			return;
		}
		// Always hand over the next card to the side that is about to move.
		if (lastMove.nextCard !== undefined) {
			setCard(lastMove.nextCard);
		}
	}, [firstCard, lastMove, card, setCard]);

	useEffect(() => {
		if (lastMove) {
			// Avoid reapplying moves when we already have the full move list rendered (e.g., history or synced games).
			if (moveList && moveList.length) {
				return;
			}
			if (lastMove.moveIndex && lastMove.moveIndex <= game.history().length) {
				return;
			}
			if (!knownLastMove || lastMove.moveIndex !== knownLastMove.moveIndex) {
				setKnownLastMove(lastMove);
				opponentMove(lastMove);
			}
		}
	}, [lastMove, knownLastMove, opponentMove, moveList]);

	const isGameOver = () => {
		const possibleMoves = game.moves({ verbose: true });
		if (game.isGameOver() || game.isDraw() || possibleMoves.length === 0) {
			return true;
		}
		return false;
	};

	const renderPlayerSlot = (slotColor: 'w' | 'b') => {
		const playerId = players ? players[slotColor] : null;
		if (!playerId && role === 'spectator' && onJoinSeat && gameStatus !== 'finished') {
			return (
				<div className='d-flex justify-content-between align-items-center' style={playerRowStyle}>
					<button className='btn btn-outline-light w-100' onClick={() => onJoinSeat(slotColor)}>
						<FormattedMessage
							id='buttons.join_as'
							defaultMessage='Join as {color}'
							values={{
								color:
									playerLabels?.[slotColor] ||
									(slotColor === 'w'
										? intl.formatMessage({ id: 'player.white', defaultMessage: 'White' })
										: intl.formatMessage({ id: 'player.black', defaultMessage: 'Black' })),
							}}
						/>
					</button>
				</div>
			);
		}

		return (
			<div className='d-flex justify-content-between align-items-center' style={playerRowStyle}>
				<PlayerInfo
					uid={players ? players[slotColor] : null}
					fallbackName={
						players
							? playerLabels?.[slotColor]
							: playerLabels?.[slotColor] || (mode === 'single' ? (slotColor === 'w' ? 'White' : 'Black') : mode === 'multi' ? undefined : slotColor === 'w' ? 'Player' : 'Computer')
					}
					timer={timers?.[slotColor]}
					isActive={turn === slotColor}
				/>
			</div>
		);
	};

	function commitMove(sourceSquare: Square, targetSquare: Square, promotion: PromotionType) {
		if (gameStatus === 'finished') return;
		const toMove: ShortMove = {
			from: sourceSquare,
			to: targetSquare,
			promotion: promotion,
		};
		const move = game.move(toMove);
		if (move) {
			gameCopy.move(toMove);
			let nextCard;
			if (!game.isGameOver()) {
				nextCard = drawCardFn();
			} else {
				nextCard = 0;
			}
			setCard(nextCard);
			sendMove &&
				sendMove(
					{
						...move,
						card: card,
						nextCard: nextCard,
						moveIndex: game.history().length,
					},
					game.fen(),
					game.pgn()
				);
			setKnownLastMove({
				...move,
				card: card,
				nextCard: nextCard,
				moveIndex: game.history().length,
			});
			setMoveFrom('');
			setOptionSquares({});
		}

		if (game.isGameOver()) {
			setResult('game_over');
		} else {
			setTurn(game.turn());
		}
	}

	function onDrop({ sourceSquare, targetSquare }: { piece: any; sourceSquare: string; targetSquare: string | null }) {
		if (gameStatus === 'finished') return false;
		if (!targetSquare) return false;
		const sourceSquareTyped = sourceSquare as Square;
		const targetSquareTyped = targetSquare as Square;
		let piece = game.get(sourceSquareTyped);
		let promotion: PromotionType;
		if (piece && piece.type === 'p' && (targetSquareTyped.indexOf('1') > -1 || targetSquareTyped.indexOf('8') > -1)) {
			let move = checkMovePossibility(sourceSquareTyped, targetSquareTyped, gameCopy);
			if (!move) return false;

			if (pieces.indexOf(card as string) > -1) {
				promotion = card.toString().toLowerCase() as PromotionType;
				return commitDrop();
			} else {
				promotionModal()
					.then((res) => {
						promotion = res;
						return commitDrop();
					})
					.catch(() => {
						promotion = 'q';
						return commitDrop();
					});
			}
			return true;
		} else return commitDrop();

		function commitDrop() {
			let move = checkMove(sourceSquareTyped, targetSquareTyped, promotion, game, gameCopy, card);
			if (move === null) return false; // illegal move

			commitMove(sourceSquareTyped, targetSquareTyped, promotion);

			isGameOver();
			return true;
		}
	}

	function getMoveOptions(square: Square) {
		const moves = getAllowedMoves(square);
		if (moves.length === 0) {
			setOptionSquares({});
			return;
		}

		const newSquares: NewSquare = {};

		moves.map((move) => {
			newSquares[move.to] = {
				background: game.get(move.to) && game.get(square) && game.get(move.to)!.color !== game.get(square)!.color ? 'radial-gradient(circle, rgba(0,0,0,.1) 85%, transparent 85%)' : 'radial-gradient(circle, rgba(0,0,0,.1) 25%, transparent 25%)',
				borderRadius: '50%',
			};
			return move;
		});
		newSquares[square] = {
			background: 'rgba(255, 255, 0, 0.4)',
		};
		setOptionSquares(newSquares);
	}

	function handleSquareSelect({ square }: { piece: any; square: string | null }) {
		if (gameStatus === 'finished') return;
		const squareTyped = square as Square;
		function resetFirstMove(square: Square) {
			setMoveFrom(square);
			getMoveOptions(square);
		}

		const allowedMoves = getAllowedMoves(squareTyped);

		// from square
		if (!moveFrom) {
			if (!allowedMoves.length) {
				setMoveFrom('');
				setOptionSquares({});
				return;
			}
			resetFirstMove(squareTyped);
			return;
		}

		// allow reselecting another piece directly
		const selectedPiece = game.get(moveFrom as Square);
		const nextPiece = game.get(squareTyped);
		if (nextPiece && selectedPiece && nextPiece.color === selectedPiece.color) {
			if (!allowedMoves.length) {
				setMoveFrom('');
				setOptionSquares({});
				return;
			}
			resetFirstMove(squareTyped);
			return;
		}

		// attempt to make move

		const move = checkMovePossibility(moveFrom as Square, squareTyped, gameCopy);

		if (move === null) {
			resetFirstMove(squareTyped);
			return;
		}
		setOptionSquares({});
		onDrop({ piece: null, sourceSquare: moveFrom as string, targetSquare: square });
		setMoveFrom('');
	}

	const reset = () => {
		game.reset();
		gameCopy.reset();
		setTurn(game.turn());
		setOptionSquares({});
		resetDeck();

		setResult('game_going');
	};

	const back = () => {
		game.undo();
		gameCopy.undo();
		setTurn(game.turn());
		setOptionSquares({});
		setResult('game_going');
		revertCard();
	};

	const playerColor = color || (mode === 'single' ? 'w' : 'w');
	const opponentColor = playerColor === 'w' ? 'b' : 'w';
	const playerRowStyle = { width: '100%', maxWidth: boardWidth, margin: '6px auto' };
	const panelStyle = { width: '100%', maxWidth: boardWidth, margin: '0 auto 10px' };
	const hasDrawOfferFromOpponent = drawOfferBy && color && drawOfferBy !== color;
	const hasMyDrawOffer = drawOfferBy && color && drawOfferBy === color;
	const showFlip = !!(players?.w && players?.b);
	const intl = useIntl();
	const historyMoves = useMemo(() => {
		if (moveList && moveList.length) {
			return moveList;
		}
		return game.history();
	}, [game, lastMove, moveList]);
	const showHistoryNav = gameStatus === 'finished' && historyMoves.length > 0;
	const activePly = viewPly ?? historyMoves.length;
	const currentFen = displayFen ?? game.fen();
	const allowUserMove = gameStatus !== 'finished' && (mode === 'single' || (role === 'participant' && playerColor === turn));
	const baseOrientation = playerColor === 'b' ? 'black' : 'white';
	const boardOrientation = isFlipped ? (baseOrientation === 'white' ? 'black' : 'white') : baseOrientation;

	const goToPly = useCallback(
		(target: number) => {
			const clamped = Math.max(0, Math.min(target, historyMoves.length));
			const viewer = new Chess(startFen);
			for (let i = 0; i < clamped; i += 1) {
				try {
					viewer.move(historyMoves[i]);
				} catch (e) {
					break;
				}
			}
			setDisplayFen(viewer.fen());
			setViewPly(clamped);
			setOptionSquares({});
		},
		[historyMoves, startFen]
	);

	useEffect(() => {
		if (gameStatus === 'finished') {
			setViewPly(historyMoves.length);
			goToPly(historyMoves.length);
			setOptionSquares({});
		} else {
			setViewPly(null);
			setDisplayFen(null);
		}
	}, [gameStatus, lastMove, historyMoves.length, goToPly]);

	const renderResult = () => {
		if (gameStatus !== 'finished') return null;
		let title: React.ReactNode = <FormattedMessage id='result.draw' />;
		if (winner) {
			title = <FormattedMessage id={winner === 'w' ? 'result.white_wins' : 'result.black_wins'} />;
		}
		return (
			<div className='result-banner'>
				<strong>{title}</strong>
				{resultReason && (
					<span className='result-reason'>
						<FormattedMessage id={`result.reason.${resultReason}`} defaultMessage={resultReason} />
					</span>
				)}
			</div>
		);
	};

	return (
		<div style={{ paddingTop: 20, paddingBottom: 50 }}>
			{(onNewGame || topControls) && (
				<div className='board-wrapper'>
					<div className='board-panel' style={{ ...panelStyle, marginBottom: 0 }}>
						<div className='d-flex gap-2 align-items-center flex-wrap'>
							{onNewGame && (
								<button onClick={onNewGame} className='btn btn-outline-light' style={{ marginBottom: 10 }}>
									<FormattedMessage id='new_game' />
								</button>
							)}
							{topControls}
						</div>
					</div>
				</div>
			)}
			<div className='board-wrapper'>
				<div className='board-panel' style={panelStyle}>
					{gameStatus === 'finished' ? renderResult() : null}
					{gameStatus !== 'finished' && (
						<p className='d-flex align-items-center gap-2'>
							<FormattedMessage id='selected_card' />:{' '}
							{card ? (
								<Badge bg='success' style={{ fontSize: 20 }}>
									<FormattedMessage id={'selected.' + card} />
								</Badge>
							) : card === 0 ? (
								<FormattedMessage id='game_over' />
							) : (
								<FormattedMessage id='waiting' />
							)}
							{onShowRules && (
								<button
									type='button'
									className='btn btn-outline-light btn-sm rounded-circle'
									style={{ width: 28, height: 28, padding: 0 }}
									onClick={onShowRules}
									aria-label={intl.formatMessage({ id: 'game_rules' })}
								>
									?
								</button>
							)}
						</p>
					)}
				</div>
				{renderPlayerSlot(opponentColor)}
				<div ref={boardContainerRef} className='board-container'>
					<Chessboard
						options={{
							allowDragging: allowUserMove,
							id: 'random-chess-board',
							position: currentFen,
							onPieceDrop: allowUserMove ? onDrop : undefined,
							onSquareClick: allowUserMove ? handleSquareSelect : undefined,
							onPieceClick: allowUserMove ? handleSquareSelect : undefined,
							boardOrientation: boardOrientation,
							squareStyles: optionSquares,
							boardStyle: { width: boardWidth },
						}}
					/>
				</div>
				{renderPlayerSlot(playerColor)}
				{showHistoryNav && (
					<div className='board-panel history-panel' style={panelStyle}>
						<div className='history-controls'>
							<button
								className='btn btn-outline-light btn-sm'
								onClick={() => goToPly((viewPly ?? historyMoves.length) - 1)}
								disabled={activePly <= 0}
							>
								◀
							</button>
							<button
								className='btn btn-outline-light btn-sm'
								onClick={() => goToPly((viewPly ?? historyMoves.length) + 1)}
								disabled={activePly >= historyMoves.length}
							>
								▶
							</button>
						</div>
						<div className='pgn-container' data-scroll-on-active='true' style={panelStyle}>
							<Moves moves={historyMoves} activePly={activePly} onSelectPly={goToPly} />
						</div>
					</div>
				)}
				{mode === 'multi' && role === 'participant' && color && (
					<div className='board-panel action-row' style={panelStyle}>
						<div className='d-flex gap-2 flex-wrap'>
							{showFlip && (
								<button className='btn btn-outline-light' onClick={() => setIsFlipped((f) => !f)}>
									<FormattedMessage id='buttons.flip_board' defaultMessage='Flip board' />
								</button>
							)}
							{gameStatus === 'playing' && (
								<>
									<button
										className='btn btn-outline-danger'
										onClick={() => {
											if (typeof window === 'undefined') return;
											setShowResignConfirm(true);
										}}
									>
										<FormattedMessage id='buttons.resign' />
									</button>
									{onOfferDraw && !hasMyDrawOffer && !hasDrawOfferFromOpponent && (
										<button className='btn btn-outline-light' onClick={() => onOfferDraw()}>
											<FormattedMessage id='buttons.offer_draw' defaultMessage='Offer a draw' />
										</button>
									)}
								</>
							)}
						</div>
						{hasDrawOfferFromOpponent && (
							<div className='d-flex align-items-center gap-2 flex-wrap mt-2'>
								<span className='small'>
									<FormattedMessage id='draw.offer_from_opponent' />
								</span>
								{onAcceptDraw && (
									<button className='btn btn-success btn-sm' onClick={onAcceptDraw}>
										<FormattedMessage id='draw.accept' defaultMessage='Accept' />
									</button>
								)}
								{onDeclineDraw && (
									<button className='btn btn-outline-light btn-sm' onClick={onDeclineDraw}>
										<FormattedMessage id='draw.decline' defaultMessage='Decline' />
									</button>
								)}
							</div>
						)}
						{hasMyDrawOffer && (
							<div className='small mt-2'>
								<FormattedMessage id='draw.offered' />
							</div>
						)}
					</div>
				)}
				{mode === 'multi' && role === 'spectator' && showFlip && (
					<div className='board-panel action-row' style={panelStyle}>
						<button className='btn btn-outline-light' onClick={() => setIsFlipped((f) => !f)}>
							<FormattedMessage id='buttons.flip_board' defaultMessage='Flip board' />
						</button>
					</div>
				)}
				<div className='board-panel' style={{ ...panelStyle, marginTop: 10 }}>
					<div style={{ paddingTop: 10 }}>
						{mode === 'single' && (
							<button onClick={back} className='btn btn-primary' style={{ marginBottom: 15 }}>
								<FormattedMessage id='undo' />
							</button>
						)}{' '}
						{mode === 'single' && (
							<button onClick={reset} className='btn btn-primary' style={{ marginBottom: 15 }}>
								<FormattedMessage id='new_game' />
							</button>
						)}{' '}
						<LangLink to='/' className='btn btn-primary' style={{ marginBottom: 15, marginRight: 10 }}>
							<FormattedMessage id='to_main' />
						</LangLink>
						{shareControl}
					</div>
				</div>
			</div>

			{!showHistoryNav && (
				<div className='pgn-container' style={panelStyle}>
					<Moves moves={historyMoves} activePly={historyMoves.length} />
				</div>
			)}
			{/* <p>
				<FormattedMessage id={result} />
			</p> */}

			<ModalContainer />
			{showResignConfirm && (
				<div className='modal-overlay'>
					<div className='modal-card'>
						<h5 className='mb-3'>
							<FormattedMessage id='buttons.resign' />
						</h5>
						<p className='mb-4'>
							<FormattedMessage id='confirm.resign' />
						</p>
						<div className='d-flex gap-2 justify-content-end'>
							<button className='btn btn-outline-light' onClick={() => setShowResignConfirm(false)}>
								<FormattedMessage id='draw.decline' defaultMessage='Cancel' />
							</button>
							<button
								className='btn btn-danger'
								onClick={() => {
									setShowResignConfirm(false);
									onResign && onResign();
								}}
							>
								<FormattedMessage id='buttons.resign' />
							</button>
						</div>
					</div>
				</div>
			)}
		</div>
	);
}

export default Board;
