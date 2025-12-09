import { doc, onSnapshot } from 'firebase/firestore';
import { db } from '../utils/firebase';
import { useEffect, useState } from 'react';
import Avatar from './Avatar';
import UserName from './UserName';

type PlayerDoc = {
	displayName?: string | null;
	isAnonymous?: boolean;
	photoURL?: string | null;
	uid?: string | null;
};

export default function PlayerInfo({ uid, timer, isActive }: { uid: string | null; timer?: string; isActive?: boolean }) {
	const [player, setPlayer] = useState<PlayerDoc | null>(null);
	const [error, setError] = useState<string | null>(null);
	const [loading, setLoading] = useState(false);

	useEffect(() => {
		if (!uid) return;
		const docRef = doc(db, 'players', uid);
		setLoading(true);
		const unsub = onSnapshot(
			docRef,
			(snap) => {
				if (snap.exists()) {
					setPlayer(snap.data() as PlayerDoc);
					setError(null);
				} else {
					setPlayer(null);
					setError('not_found');
				}
				setLoading(false);
			},
			(err) => {
				setError(err.message);
				setLoading(false);
			}
		);
		return () => unsub();
	}, [uid]);

	return (
		<>
			{loading && <div className='text-muted' style={{ fontSize: 12 }}>Loading...</div>}
			{player && (
				<div className={`player-info${isActive ? ' player-active' : ''}`}>
					<div className='player-main'>
						<Avatar url={player.photoURL} size={25} />
						<div className='player-name'>
							<UserName user={player as any} />
						</div>
					</div>
					{timer && <span className='player-timer'>{timer}</span>}
				</div>
			)}
			{!player && error && <div className='text-muted' style={{ fontSize: 12 }}>Player unavailable</div>}
		</>
	);
}
