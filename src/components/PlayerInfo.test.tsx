import { render, screen, waitFor } from '@testing-library/react';
import PlayerInfo from './PlayerInfo';

vi.mock('firebase/firestore', () => {
	const onSnapshot = vi.fn((ref: any, onNext: any) => {
		onNext({
			exists: () => true,
			data: () => ({ displayName: 'Test', isAnonymous: false, photoURL: null, uid: 'uid' }),
		});
		return () => {};
	});
	const doc = vi.fn();
	return { onSnapshot, doc, getFirestore: vi.fn() };
});

describe('PlayerInfo', () => {
	it('renders player info after load', async () => {
		render(<PlayerInfo uid='uid' />);
		await waitFor(() => expect(screen.getByText('Test')).toBeDefined());
	});
});
