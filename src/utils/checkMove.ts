import { Chess, Square } from 'chess.js';
import isValidMove from './isValidMove';

type PromotionType = 'b' | 'n' | 'r' | 'q' | undefined;

/**
 * Checks if the move is valid according to chess rules AND selected card
 */
const checkMove = (from: Square, to: Square, promotion: PromotionType, game: Chess, gameCopy: Chess, card: string | number) => {
	if (!from || !to) return null;
	try {
		const move = gameCopy.move({
			from: from,
			to: to,
			promotion: promotion,
		});
		if (!move) return null;
		gameCopy.undo();
		if (!isValidMove(move, card, gameCopy)) {
			return null;
		}
		return move;
	} catch (e) {
		// If chess.js rejects the move, treat it as invalid for our card constraints.
		return null;
	}
};

export default checkMove;
