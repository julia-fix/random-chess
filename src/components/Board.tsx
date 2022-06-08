import { Chessboard, Square } from 'react-chessboard';
import { Chess, ChessInstance, ShortMove } from 'chess.js';
import { useState, useEffect, useRef } from 'react';
import { Badge } from 'react-bootstrap';
import { FormattedMessage } from 'react-intl';
import { promotionModal } from '../components/promotionModal';
import { Container as ModalContainer } from 'react-modal-promise';
import { pieces, cards } from '../utils/cardsList';
import isValidMove from '../utils/isValidMove';
import checkMove from '../utils/checkMove';
import checkMovePossibility from '../utils/checkMovePossibility';
import { Link } from 'react-router-dom';

type PromotionType = 'b' | 'n' | 'r' | 'q' | undefined;

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
	color?: string;
	role?: string;
	sendMove?: (move: any, fen: string, pgn: string) => void;
	sendFirstCard?: (card: any) => void;
	mode: 'single' | 'multi';
	lastMove?: any;
	firstCard?: string | number;
};

function Board({ fen, pgn, role, color, sendMove, mode, lastMove, sendFirstCard, firstCard }: Props) {
	// const [game] = useState<ChessInstance>(new Chess('8/1P1P1P1P/8/1K6/6k1/8/p1p1p1p1/8 w KQkq - 0 1'));
	// const [gameCopy] = useState<ChessInstance>(new Chess('8/1P1P1P1P/8/1K6/6k1/8/p1p1p1p1/8 w KQkq - 0 1'));
	const [game] = useState<ChessInstance>(new Chess());
	const [gameCopy] = useState<ChessInstance>(new Chess());
	const [card, setCard] = useState<string | number>('');
	const [moveFrom, setMoveFrom] = useState('');
	const [turn, setTurn] = useState<string>('w');
	const [boardWidth, setBoardWidth] = useState(400);
	const boardContainerRef = useRef<HTMLDivElement>(null);
	const [cardsHistory, setCardsHistory] = useState<Array<string | number>>([]);
	const [result, setResult] = useState<string>('game_going');
	const [knownLastMove, setKnownLastMove] = useState<any>();

	// const promotionDialog = () => {
	// 	console.log('promotionDialog');
	// 	promotionModal()
	// 		.then((res) => {
	// 			console.log('Modal promise resolved', res);
	// 		})
	// 		.catch(() => {
	// 			console.log('Modal promise rejected');
	// 		});
	// };

	const calcBoardWidth = () => {
		if (boardContainerRef.current) {
			let boardWidth = boardContainerRef.current.clientWidth;
			if (boardWidth > 500) boardWidth = 500;
			setBoardWidth(boardWidth);
		} else {
			setBoardWidth(400);
		}
	};

	const selectCard = () => {
		let newCard: string | number;
		let cardPossible = false;
		do {
			newCard = cards[Math.floor(Math.random() * cards.length)];
			const possibleMoves = game.moves({ verbose: true });
			for (const move of possibleMoves) {
				if (isValidMove(move, newCard, gameCopy)) {
					cardPossible = true;
					break;
				}
			}
		} while (!cardPossible);
		if (mode === 'single') {
			cardsHistory.push(newCard);
		}
		return newCard;
	};

	useEffect(() => {
		calcBoardWidth();
		window.addEventListener('resize', calcBoardWidth);
		if (fen) {
			game.load(fen);
			gameCopy.load(fen);
		}
		if (pgn) {
			game.load_pgn(pgn);
			gameCopy.load_pgn(pgn);
		}
		if (mode === 'single') {
			setCard(selectCard());
		} else {
			if (lastMove) {
				console.log('setting card to last move', lastMove);
				setCard(lastMove.nextCard);
			} else if (color === 'w' && !firstCard) {
				const newCard = selectCard();
				setCard(newCard);
				sendFirstCard && sendFirstCard(newCard);
			}
		}
		return () => {
			window.removeEventListener('resize', calcBoardWidth);
		};
	}, []);

	useEffect(() => {
		if (firstCard && !card && !lastMove) setCard(firstCard);
		else if (lastMove && !card) setCard(lastMove.nextCard);
	}, [firstCard, lastMove]);

	useEffect(() => {
		console.log('lastMove changed', lastMove, knownLastMove);
		if (lastMove) {
			if (!knownLastMove || lastMove.moveIndex !== knownLastMove.moveIndex) {
				setKnownLastMove(lastMove);
				opponentMove(lastMove);
			}
		}
	}, [lastMove]);

	const isGameOver = () => {
		const possibleMoves = game.moves({ verbose: true });
		if (game.game_over() || game.in_draw() || possibleMoves.length === 0) {
			return true;
		}
		return false;
	};

	function opponentMove(receivedMove: any) {
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

		if (game.game_over()) {
			setResult('game_over');
		} else {
			setTurn(game.turn());
		}
	}

	function commitMove(sourceSquare: Square, targetSquare: Square, promotion: PromotionType) {
		console.log('commitMove', sourceSquare, targetSquare, promotion);
		const toMove: ShortMove = {
			from: sourceSquare,
			to: targetSquare,
			promotion: promotion,
		};
		const move = game.move(toMove);
		console.log('commitMove move', move);
		if (move) {
			gameCopy.move(toMove);
			console.log('gameCopy moved');
			let nextCard;
			if (!game.game_over()) {
				nextCard = selectCard();
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
		}

		if (game.game_over()) {
			setResult('game_over');
		} else {
			setTurn(game.turn());
		}
	}

	function onDrop(sourceSquare: Square, targetSquare: Square) {
		let piece = game.get(sourceSquare);
		let promotion: PromotionType;
		if (piece && piece.type === 'p' && (targetSquare.indexOf('1') > -1 || targetSquare.indexOf('8') > -1)) {
			let move = checkMovePossibility(sourceSquare, targetSquare, gameCopy);
			if (!move) return false;

			if (pieces.indexOf(card as string) > -1) {
				promotion = card.toString().toLowerCase() as PromotionType;
				return commitDrop();
			} else {
				promotionModal()
					.then((res) => {
						console.log('Modal promise resolved', res);
						promotion = res;
						return commitDrop();
					})
					.catch(() => {
						console.log('Modal promise rejected');
						promotion = 'q';
						return commitDrop();
					});
			}
			return true;
		} else return commitDrop();

		function commitDrop() {
			console.log('commitDrop', sourceSquare, targetSquare, promotion);
			let move = checkMove(sourceSquare, targetSquare, promotion, game, gameCopy, card);
			console.log('move', move);
			if (move === null) return false; // illegal move

			commitMove(sourceSquare, targetSquare, promotion);

			isGameOver();
			return true;
		}
	}

	const [optionSquares, setOptionSquares] = useState({});

	function getMoveOptions(square: Square) {
		const moves = game.moves({
			square,
			verbose: true,
		});
		if (moves.length === 0) {
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

	function onSquareClick(square: Square) {
		function resetFirstMove(square: Square) {
			setMoveFrom(square);
			getMoveOptions(square);
		}

		// from square
		if (!moveFrom) {
			resetFirstMove(square);
			return;
		}

		// attempt to make move

		const move = checkMovePossibility(moveFrom as Square, square, gameCopy);

		if (move === null) {
			resetFirstMove(square);
			return;
		}
		setOptionSquares({});
		onDrop(moveFrom as Square, square);
	}

	const reset = () => {
		game.reset();
		gameCopy.reset();
		setTurn(game.turn());
		setOptionSquares({});
		setCardsHistory([]);
		setCard(selectCard());

		setResult('game_going');
	};

	const back = () => {
		game.undo();
		gameCopy.undo();
		setTurn(game.turn());
		setOptionSquares({});
		setResult('game_going');
		if (cardsHistory.length > 1) {
			console.log('back', cardsHistory);
			setCard(cardsHistory[cardsHistory.length - 2]);
			setCardsHistory(cardsHistory.slice(0, -1));
		} else {
			setCard(cardsHistory[0]);
		}
	};

	return (
		<div style={{ paddingTop: 20 }}>
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
			<div ref={boardContainerRef}>
				<Chessboard
					arePiecesDraggable={mode === 'single' || (role === 'participant' && color === turn)}
					id={1}
					position={game.fen()}
					onPieceDrop={mode === 'single' || (role === 'participant' && color === turn) ? onDrop : undefined}
					onSquareClick={mode === 'single' || (role === 'participant' && color === turn) ? onSquareClick : undefined}
					boardWidth={boardWidth}
					boardOrientation={color === 'b' ? 'black' : 'white'}
					customSquareStyles={{
						...optionSquares,
					}}
				/>
			</div>

			{mode === 'single' && (
				<div style={{ paddingTop: 20 }}>
					<button onClick={back} className='btn btn-primary' style={{ marginBottom: 15 }}>
						<FormattedMessage id='undo' />
					</button>{' '}
					<button onClick={reset} className='btn btn-primary' style={{ marginBottom: 15 }}>
						<FormattedMessage id='new_game' />
					</button>{' '}
					<Link to='/chess' className='btn btn-primary' style={{ marginBottom: 15 }}>
						<FormattedMessage id='to_main' />
					</Link>
				</div>
			)}
			<div className='pgn-container'>{game.pgn()}</div>
			{/* <p>
				<FormattedMessage id={result} />
			</p> */}

			<ModalContainer
				onOpen={() => {
					console.log('onopen');
				}}
				onRemove={() => {
					console.log('onRemove');
				}}
			/>
		</div>
	);
}

export default Board;
