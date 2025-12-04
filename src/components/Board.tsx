import { Chessboard } from 'react-chessboard';
import { Chess, Square } from 'chess.js';
import { useState, useEffect, useRef, useCallback } from 'react';
import { Badge } from 'react-bootstrap';
import { FormattedMessage } from 'react-intl';
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
	color?: 'w' | 'b';
	role?: string;
	sendMove?: (move: any, fen: string, pgn: string) => void;
	sendFirstCard?: (card: any) => void;
	mode: 'single' | 'multi';
	lastMove?: any;
	firstCard?: string | number;
	players?: { w: string | null; b: string | null };
	shareControl?: React.ReactNode;
};

function Board({ fen, pgn, role, color, sendMove, mode, lastMove, sendFirstCard, firstCard, players, shareControl }: Props) {
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
	const loadedFenRef = useRef<string | undefined>();
	const loadedPgnRef = useRef<string | undefined>();
	const boardWidth = useBoardSize(boardContainerRef);
	const { card, setCard, drawCard, resetDeck, revertCard, cardsHistory } = useCardDeck(mode, game, gameCopy);
	const [optionSquares, setOptionSquares] = useState({});

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
				drawCard();
				cardInitRef.current = true;
			} else if (mode === 'multi') {
				if (lastMove) {
					setCard(lastMove.nextCard);
				} else if (color === 'w' && !firstCard) {
					const newCard = drawCard();
					sendFirstCard && sendFirstCard(newCard);
				}
			}
			setTurn(game.turn());
			setInited(true);
		}
	}, [color, fen, pgn, mode, lastMove, firstCard, sendFirstCard, gameCopy, game, drawCard, inited, setCard]);

	useEffect(() => {
		if (firstCard && !card && !lastMove) setCard(firstCard);
		else if (lastMove && !card) setCard(lastMove.nextCard);
	}, [firstCard, lastMove, card]);

	useEffect(() => {
		// console.log('lastMove changed', lastMove, knownLastMove);
		if (lastMove) {
			if (lastMove.moveIndex && lastMove.moveIndex <= game.history().length) {
				return;
			}
			if (!knownLastMove || lastMove.moveIndex !== knownLastMove.moveIndex) {
				setKnownLastMove(lastMove);
				opponentMove(lastMove);
			}
		}
	}, [lastMove, knownLastMove, opponentMove]);

	const isGameOver = () => {
		const possibleMoves = game.moves({ verbose: true });
		if (game.isGameOver() || game.isDraw() || possibleMoves.length === 0) {
			return true;
		}
		return false;
	};

	function commitMove(sourceSquare: Square, targetSquare: Square, promotion: PromotionType) {
		// console.log('commitMove', sourceSquare, targetSquare, promotion);
		const toMove: ShortMove = {
			from: sourceSquare,
			to: targetSquare,
			promotion: promotion,
		};
		const move = game.move(toMove);
		// console.log('commitMove move', move);
		if (move) {
			gameCopy.move(toMove);
			// console.log('gameCopy moved');
			let nextCard;
			if (!game.isGameOver()) {
				nextCard = drawCard();
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
			// console.log('game pgn', game.pgn());
			// console.log('gamecopy pgn', gameCopy.pgn());
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
						// console.log('Modal promise resolved', res);
						promotion = res;
						return commitDrop();
					})
					.catch(() => {
						// console.log('Modal promise rejected');
						promotion = 'q';
						return commitDrop();
					});
			}
			return true;
		} else return commitDrop();

		function commitDrop() {
			// console.log('commitDrop', sourceSquare, targetSquare, promotion);
			let move = checkMove(sourceSquareTyped, targetSquareTyped, promotion, game, gameCopy, card);
			// console.log('move', move);
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

	function handleSquareSelect({ square }: { piece: any; square: string }) {
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

	// const onPieceDragBegin = (piece: any, sourceSquare: any) => {
	// 	console.log('piece', piece);
	// 	console.log('sourceSquare', sourceSquare);
	// 	if (piece.substring(0, 1) !== turn) {
	// 		console.log('Wrong!');
	// 		return false;
	// 	}
	// };

	return (
		<div style={{ paddingTop: 20, paddingBottom: 50 }}>
			<p>
				<FormattedMessage id='turn' />:{' '}
				<Badge bg={turn === 'b' ? 'dark' : 'light'} text={turn === 'b' ? 'light' : 'dark'}>
					<FormattedMessage id={'turn.' + turn} />
				</Badge>
			</p>
			<p>
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
			</p>
			{players && color && <PlayerInfo uid={players[color === 'w' ? 'b' : 'w']} />}
			<div ref={boardContainerRef} className='board-container'>
				<Chessboard
					options={{
						allowDragging: mode === 'single' || (role === 'participant' && color === turn),
						id: 'random-chess-board',
						position: game.fen(),
						onPieceDrop: mode === 'single' || (role === 'participant' && color === turn) ? onDrop : undefined,
						onSquareClick: mode === 'single' || (role === 'participant' && color === turn) ? handleSquareSelect : undefined,
						onPieceClick: mode === 'single' || (role === 'participant' && color === turn) ? handleSquareSelect : undefined,
						boardOrientation: color === 'b' ? 'black' : 'white',
						squareStyles: optionSquares,
						boardStyle: { width: boardWidth },
					}}
				/>
			</div>
			{players && color && <PlayerInfo uid={players[color]} />}

			<div style={{ paddingTop: 20 }}>
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

			<div className='pgn-container'><Moves game={game} /></div>
			{/* <p>
				<FormattedMessage id={result} />
			</p> */}

			<ModalContainer
				onOpen={() => {
					// console.log('onopen');
				}}
				onRemove={() => {
					// console.log('onRemove');
				}}
			/>
		</div>
	);
}

export default Board;
