import { render, act } from '@testing-library/react';
import { IntlProvider } from 'react-intl';
import { MemoryRouter } from 'react-router-dom';
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { UserContext } from '../contexts/UserContext';
import PlayGame from './PlayGame';
import English from '../lang/en.json';

vi.mock('react-router', async () => {
	const actual = await vi.importActual<any>('react-router');
	return {
		...actual,
		useParams: () => ({ gameId: 'game-1' }),
	};
});

const mockSession = {
	game: { white: 'u1', black: 'u2' },
	gameData: {
		status: 'playing',
		whiteArrived: true,
		blackArrived: true,
		whiteTimeLeftMs: 0,
		blackTimeLeftMs: 5000,
	},
	moves: { moves: [] },
	gameDataRef: { id: 'gameData' },
	movesRef: { id: 'moves' },
	gameRef: { id: 'games' },
	loading: false,
};

vi.mock('../hooks/useGameSession', () => ({
	default: () => mockSession,
}));

const setClocksSnapshot = vi.fn();
const finishGame = vi.fn();

vi.mock('../services/gameService', () => ({
	updateFirstCard: vi.fn(),
	updateMovesDoc: vi.fn(),
	markPlayerArrived: vi.fn(),
	setGameStatus: vi.fn(),
	updateClocksOnMove: vi.fn(),
	finishGame: (...args: any[]) => finishGame(...args),
	offerDraw: vi.fn(),
	clearDrawOffer: vi.fn(),
	setClocksSnapshot: (...args: any[]) => setClocksSnapshot(...args),
}));

vi.mock('../components/GameChat', () => ({
	default: () => null,
}));

vi.mock('../components/ShareGame', () => ({
	default: () => null,
}));

vi.mock('../components/Board', () => ({
	default: () => <div data-testid='board' />,
}));

describe('PlayGame timeout flow', () => {
	beforeEach(() => {
		vi.useFakeTimers();
	});

	afterEach(() => {
		vi.runOnlyPendingTimers();
		vi.useRealTimers();
	});

	it('finishes the game when a player runs out of time', async () => {
		const user = {
			uid: 'u1',
			displayName: 'Player',
			photoURL: null,
			isAnonymous: false,
			loggedIn: true,
			loading: false,
		};
		const { unmount } = render(
			<IntlProvider locale='en' messages={English}>
				<UserContext.Provider value={user as any}>
					<MemoryRouter>
						<PlayGame />
					</MemoryRouter>
				</UserContext.Provider>
			</IntlProvider>
		);

		await act(async () => {});
		act(() => {
			vi.advanceTimersByTime(1100);
		});
		await act(async () => {});
		expect(setClocksSnapshot).toHaveBeenCalledWith({ id: 'gameData' }, 0, 5000);
		expect(finishGame).toHaveBeenCalledWith({ id: 'gameData' }, 'b', 'timeout');
		unmount();
	});
});
