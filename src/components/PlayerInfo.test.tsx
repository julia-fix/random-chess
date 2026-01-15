import { render, screen, waitFor } from '@testing-library/react';
import { IntlProvider } from 'react-intl';
import PlayerInfo from './PlayerInfo';

vi.mock('firebase/firestore', () => {
	const getDoc = vi.fn(async () => ({
		exists: () => true,
		data: () => ({ displayName: 'Test', isAnonymous: false, photoURL: null, uid: 'uid' }),
	}));
	const doc = vi.fn();
	return { getDoc, doc, getFirestore: vi.fn() };
});

describe('PlayerInfo', () => {
	it('renders player info after load', async () => {
		render(
			<IntlProvider locale='en' messages={{}}>
				<PlayerInfo uid='uid' />
			</IntlProvider>
		);
		await waitFor(() => expect(screen.getByText('Test')).toBeDefined());
	});
});
