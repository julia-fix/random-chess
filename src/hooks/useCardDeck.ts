import { useCallback, useState } from 'react';
import { Chess } from 'chess.js';
import { drawNextCard, initialDeck } from '../utils/cardDeck';

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
	const [deck, setDeck] = useState(() => initialDeck());

	const drawCard = useCallback(() => {
		const { card: newCard, deck: nextDeck } = drawNextCard(deck, game, gameCopy);
		setDeck(nextDeck);
		setCard(newCard);
		if (mode === 'single') {
			setCardsHistory((prev) => [...prev, newCard]);
		}
		return newCard;
	}, [deck, game, gameCopy, mode]);

	const resetDeck = useCallback(() => {
		setCardsHistory([]);
		setDeck(initialDeck());
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
