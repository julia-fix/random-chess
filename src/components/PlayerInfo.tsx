import { doc, onSnapshot } from 'firebase/firestore';
import { db } from '../utils/firebase';
import { useEffect, useState } from 'react';
import Avatar from './Avatar';
import UserName from './UserName';
import { useIntl } from 'react-intl';

type PlayerDoc = {
	displayName?: string | null;
	isAnonymous?: boolean;
	photoURL?: string | null;
	uid?: string | null;
};

export default function PlayerInfo({ uid, timer, isActive, fallbackName }: { uid: string | null; timer?: string; isActive?: boolean; fallbackName?: string }) {
	const [player, setPlayer] = useState<PlayerDoc | null>(null);
	const [error, setError] = useState<string | null>(null);
	const [loading, setLoading] = useState(false);
	const intl = useIntl();

	useEffect(() => {
		if (!uid) {
			setPlayer(null);
			setError(null);
			setLoading(false);
			return;
		}
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
			{loading && <div className='text-muted' style={{ fontSize: 12 }}>{intl.formatMessage({ id: 'player.loading', defaultMessage: 'Loading...' })}</div>}
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
			{!player && fallbackName && (
				<div className={`player-info${isActive ? ' player-active' : ''}`}>
					<div className='player-main'>
						<Avatar url={null} size={25} />
						<div className='player-name'>{fallbackName}</div>
					</div>
					{timer && <span className='player-timer'>{timer}</span>}
				</div>
			)}
			{!player && error && !fallbackName && (
				<div className='text-muted' style={{ fontSize: 12 }}>
					{intl.formatMessage({ id: 'player.unavailable', defaultMessage: 'Player unavailable' })}
				</div>
			)}
		</>
	);
}
