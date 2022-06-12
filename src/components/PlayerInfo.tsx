import { doc, DocumentData, getDoc } from 'firebase/firestore';
import { db } from '../utils/firebase';
import { useEffect, useState } from 'react';
import Avatar from './Avatar';
import UserName from './UserName';

export default function PlayerInfo({ uid }: { uid: string | null }) {
	const [player, setPlayer] = useState<DocumentData>();

	useEffect(() => {
		const getData = async () => {
			if (uid) {
				const docRef = doc(db, 'players', uid);
				const docSnap = await getDoc(docRef);
				if (docSnap.exists()) {
					const data = docSnap.data();
					// console.log(data);
					setPlayer(data);
				}
			}
		};

		getData();
	}, [uid]);

	return (
		<>
			{player && (
				<div className='player-data'>
					<Avatar url={player.photoURL} size={25} />
					<div className='player-data-name'>
						<UserName user={player as any} />
					</div>
				</div>
			)}
		</>
	);
}
