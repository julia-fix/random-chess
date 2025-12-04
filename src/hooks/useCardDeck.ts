import { useCallback, useState } from 'react';
import { Chess } from 'chess.js';
import { cards, pieces } from '../utils/cardsList';
import isValidMove from '../utils/isValidMove';

type Mode = 'single' | 'multi';

type CardDeckState = {
	card: string | number;
	cardsHistory: Array<string | number>;
	drawCard: () => string | number;
	resetDeck: () => string | number;
	revertCard: () => string | number | undefined;
	setCard: (value: string | number) => void;
};

export default function useCardDeck(mode: Mode, game: Chess, gameCopy: Chess): CardDeckState {
	const [card, setCard] = useState<string | number>('');
	const [cardsHistory, setCardsHistory] = useState<Array<string | number>>([]);
	const [cardsRemained, setCardsRemained] = useState(cards);

	const pickCard = useCallback(() => {
		let newCard: string | number;
		let cardPossible = false;
		let cardsRemainedCopy = [...cardsRemained];
		do {
			newCard = cardsRemainedCopy[Math.floor(Math.random() * cardsRemainedCopy.length)];
			const newCardCopy = newCard;
			cardsRemainedCopy = cardsRemainedCopy.filter((c) => c !== newCardCopy);
			if (!cardsRemainedCopy.length) {
				cardsRemainedCopy = [...cards];
			}
			const possibleMoves = game.moves({ verbose: true });
			for (const move of possibleMoves) {
				if (isValidMove(move, newCard, gameCopy)) {
					cardPossible = true;
					break;
				}
			}
		} while (!cardPossible);
		setCardsRemained(cardsRemainedCopy);
		return newCard;
	}, [cardsRemained, game, gameCopy]);

	const drawCard = useCallback(() => {
		const newCard = pickCard();
		setCard(newCard);
		if (mode === 'single') {
			setCardsHistory((prev) => [...prev, newCard]);
		}
		return newCard;
	}, [pickCard, mode]);

	const resetDeck = useCallback(() => {
		setCardsHistory([]);
		return drawCard();
	}, [drawCard]);

	const revertCard = useCallback(() => {
		if (mode !== 'single') return card;
		let nextCard: string | number | undefined = card;
		setCardsHistory((prev) => {
			if (!prev.length) {
				nextCard = '';
				setCard('');
				return prev;
			}
			if (prev.length === 1) {
				nextCard = prev[0];
				setCard(prev[0]);
				return prev;
			}
			nextCard = prev[prev.length - 2];
			setCard(nextCard);
			return prev.slice(0, -1);
		});
		return nextCard;
	}, [card, mode]);

	return {
		card,
		cardsHistory,
		drawCard,
		resetDeck,
		revertCard,
		setCard,
	};
}
