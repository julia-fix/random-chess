import { render, screen } from '@testing-library/react';
import GameChat from './GameChat';
import { UserContext } from '../contexts/UserContext';
import { IntlProvider } from 'react-intl';
import English from '../lang/en.json';
import '@testing-library/jest-dom';
import { act } from 'react';
import { vi } from 'vitest';

vi.mock('firebase/firestore', () => {
	const onSnapshot = vi.fn((ref: any, onNext: any) => {
		onNext({
			data: () => ({
				messages: [
					{
						msgId: '1',
						text: 'Hello',
						author: { uid: 'me', displayName: 'Me', photoURL: null, isAnonymous: false },
						createdAt: { toDate: () => new Date() },
					},
				],
				unread: { me: 0 },
			}),
		});
		return () => {};
	});
	const doc = vi.fn();
	const updateDoc = vi.fn();
	const arrayUnion = (...vals: any[]) => ({ _arrayUnion: vals });
	const runTransaction = vi.fn();
	return { onSnapshot, doc, updateDoc, arrayUnion, runTransaction, getFirestore: vi.fn() };
});

const user = {
	displayName: 'Me',
	loggedIn: true,
	loading: false,
	isAnonymous: false,
	photoURL: null,
	uid: 'me',
};

describe('GameChat', () => {
	beforeAll(() => {
		// react-bootstrap Offcanvas uses matchMedia
		// @ts-ignore
		window.matchMedia = window.matchMedia || vi.fn().mockReturnValue({ matches: false, addListener: vi.fn(), removeListener: vi.fn() });
		// mock scrollTo on elements
		// @ts-ignore
		window.HTMLElement.prototype.scrollTo = vi.fn();
	});

	it('renders messages and input', () => {
		render(
			<IntlProvider locale="en" messages={English}>
				<UserContext.Provider value={user}>
					<GameChat gameId="gid" />
				</UserContext.Provider>
			</IntlProvider>
		);
		// open chat to render messages
		act(() => {
			screen.getByAltText('Chat').click();
		});
		expect(screen.getByText('Hello')).toBeDefined();
		expect(screen.getByPlaceholderText('Enter message')).toBeDefined();
	});
});
