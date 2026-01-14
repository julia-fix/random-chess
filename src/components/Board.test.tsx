import { render, screen, fireEvent } from '@testing-library/react';
import { IntlProvider } from 'react-intl';
import { MemoryRouter } from 'react-router-dom';
import { describe, it, expect, vi } from 'vitest';
import Board from './Board';
import English from '../lang/en.json';

vi.mock('react-chessboard', () => ({
	Chessboard: ({ options }: any) => (
		<button
			type='button'
			data-testid='drop-move'
			onClick={() => options.onPieceDrop({ sourceSquare: 'e2', targetSquare: 'e4' })}
		>
			Drop
		</button>
	),
}));

vi.mock('../hooks/useBoardSize', () => ({
	default: () => 400,
}));

vi.mock('../hooks/useCardDeck', () => ({
	default: () => ({
		card: 'e',
		setCard: vi.fn(),
		drawCard: vi.fn(() => 'e'),
		resetDeck: vi.fn(),
		revertCard: vi.fn(),
		cardsHistory: [],
	}),
}));

vi.mock('firebase/firestore', () => ({
	doc: vi.fn(),
	onSnapshot: vi.fn(() => () => {}),
	getFirestore: vi.fn(),
}));

describe('Board flow', () => {
	it('sends a move when a legal drop matches the current card', () => {
		const sendMove = vi.fn();
		render(
			<IntlProvider locale='en' messages={English}>
				<MemoryRouter>
					<Board mode='single' sendMove={sendMove} />
				</MemoryRouter>
			</IntlProvider>
		);

		fireEvent.click(screen.getByTestId('drop-move'));

		expect(sendMove).toHaveBeenCalledTimes(1);
		expect(sendMove.mock.calls[0][0]).toMatchObject({
			from: 'e2',
			to: 'e4',
			card: 'e',
		});
	});
});
