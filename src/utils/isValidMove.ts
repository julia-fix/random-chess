import { numbers, letters, pieces, pawns } from '../utils/cardsList';
import { Chess, Move } from 'chess.js';

/**
 * Checks if the move is valid according to selected card
 */
const isValidMove = (move: Move, cardToCheck: string | number, game: Chess) => {
	// console.log('cardToCheck', cardToCheck);
	// console.log('move', move);
	if (cardToCheck === 'any') return true;
	if (numbers.indexOf(cardToCheck as number) > -1 || letters.indexOf(cardToCheck as string) > -1) {
		if (move.from.indexOf(cardToCheck.toString()) > -1 || move.to.indexOf(cardToCheck.toString()) > -1) {
			return true;
		}
	}
	if (pieces.indexOf(cardToCheck as string) > -1 || pawns.indexOf(cardToCheck as string) > -1) {
		let cardL = cardToCheck.toString().toLowerCase();
		let possibleVars = [(move.captured as string) || undefined, move.piece as string, (move.promotion as string) || undefined];
		if (possibleVars.indexOf(cardL) > -1) {
			return true;
		}
	}
	if (cardToCheck === 'check') {
		if (move.san.indexOf('+') > -1 || move.san.indexOf('#') > -1) {
			return true;
		}
	}
	if (cardToCheck === 'stalemate') {
		let moveToCheck = game.move(move);
		if (moveToCheck) {
			if (game.isStalemate()) {
				game.undo();
				return true;
			} else {
				game.undo();
			}
		}
	}
	if (cardToCheck === 'take') {
		if (move.captured) {
			return true;
		}
	}
	if (move.flags.indexOf('q') > -1 || move.flags.indexOf('k') > -1) {
		let possibleCards: (string | number)[] = ['R', 'K'];
		if (move.flags.indexOf('q') > -1) {
			possibleCards = [...possibleCards, 'a', 'b', 'c', 'd', 'e'];
		} else {
			possibleCards = [...possibleCards, 'e', 'f', 'g', 'h'];
		}
		if (move.color === 'w') {
			possibleCards.push(1);
		} else {
			possibleCards.push(8);
		}
		if (possibleCards.indexOf(cardToCheck) > -1) {
			return true;
		}
	}
	return false;
};

export default isValidMove;
