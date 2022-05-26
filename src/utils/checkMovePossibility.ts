import { ChessInstance } from 'chess.js';
import { Square } from 'react-chessboard';

/**
 * Checks if the move is valid according to chess rules
 */
const checkMovePossibility = (from: Square, to: Square, gameCopy: ChessInstance) => {
	if (!from || !to) return null;
	const move = gameCopy.move({
		from: from,
		to: to,
		promotion: 'q',
	});
	move && gameCopy.undo();
	return move;
};

export default checkMovePossibility;
