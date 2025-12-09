import { Chess, Square } from 'chess.js';

/**
 * Checks if the move is valid according to chess rules
 */
const checkMovePossibility = (from: Square, to: Square, gameCopy: Chess) => {
	if (!from || !to) return null;
	try {
		const move = gameCopy.move({
			from: from,
			to: to,
			promotion: 'q',
		});
		if (!move) return null;
		gameCopy.undo();
		return move;
	} catch (e) {
		return null;
	}
};

export default checkMovePossibility;
