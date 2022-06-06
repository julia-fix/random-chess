import { Square } from 'react-chessboard';
import { ChessInstance } from 'chess.js';
import isValidMove from './isValidMove';

type PromotionType = 'b' | 'n' | 'r' | 'q' | undefined;

/**
 * Checks if the move is valid according to chess rules AND selected card
 */
const checkMove = (from: Square, to: Square, promotion: PromotionType, game: ChessInstance, gameCopy: ChessInstance, card: string | number) => {
	if (!from || !to) return null;
	const move = gameCopy.move({
		from: from,
		to: to,
		promotion: promotion,
	});
	move && gameCopy.undo();
	if (move && !isValidMove(move, card, gameCopy)) {
		return null;
	}
	return move;
};

export default checkMove;
