import { useEffect, useState, useContext, useMemo } from 'react';
import { collection, getDocs, query, where } from 'firebase/firestore';
import { db } from '../utils/firebase';
import { Link } from 'react-router-dom';
import { FormattedMessage, useIntl } from 'react-intl';
import { UserContext } from '../contexts/UserContext';
import usePageMeta from '../hooks/usePageMeta';

type GameRow = {
	id: string;
	createdAt?: any;
	white?: string | null;
	black?: string | null;
	whiteName?: string | null;
	blackName?: string | null;
	opponentId?: string | null;
};

export default function HistoryList() {
	const user = useContext(UserContext);
	const [games, setGames] = useState<GameRow[]>([]);
	const [loading, setLoading] = useState(true);
	const intl = useIntl();
	usePageMeta({
		titleId: 'meta.title.history',
		titleDefault: 'Game History | Random Chess',
		descriptionId: 'meta.desc.history',
		descriptionDefault: 'Browse your past Random Chess games and open full replays.',
	});

	const uid = useMemo(() => user.uid, [user.uid]);

	useEffect(() => {
		const load = async () => {
			if (!uid) {
				setGames([]);
				setLoading(false);
				return;
			}
			try {
				const gamesRef = collection(db, 'games');
				const snap = await getDocs(query(gamesRef, where('participants', 'array-contains', uid)));
				let rows: GameRow[] = [];
				snap.forEach((doc) => rows.push({ id: doc.id, ...(doc.data() as any) }));
				// Fallback for legacy games without participants field
				if (rows.length === 0) {
					const [whiteSnap, blackSnap] = await Promise.all([getDocs(query(gamesRef, where('white', '==', uid))), getDocs(query(gamesRef, where('black', '==', uid)))]);
					whiteSnap.forEach((doc) => rows.push({ id: doc.id, ...(doc.data() as any) }));
					blackSnap.forEach((doc) => {
						if (!rows.find((r) => r.id === doc.id)) rows.push({ id: doc.id, ...(doc.data() as any) });
					});
				}
				rows.sort((a, b) => (b.createdAt?.seconds || 0) - (a.createdAt?.seconds || 0));
				setGames(rows);
			} catch (e) {
				console.error(e);
			} finally {
				setLoading(false);
			}
		};
		load();
	}, [uid]);

	return (
		<div style={{ paddingTop: 20 }}>
			<h2 className='mb-3'>
				<FormattedMessage id='history' defaultMessage='History' />
			</h2>
			{loading && (
				<div>
					<FormattedMessage id='loading' defaultMessage='Loading...' />
				</div>
			)}
			{!loading && games.length === 0 && (
				<div>
					<FormattedMessage id='history.empty' defaultMessage='No games yet.' />
				</div>
			)}
			<div className='list-group'>
				{games.map((g) => (
					<Link key={g.id} className='list-group-item list-group-item-action' to={g.id}>
						<div className='d-flex justify-content-between'>
							<span>
								<FormattedMessage
									id='history.game_with'
									defaultMessage='Game with {name}'
									values={{
										name: g.white === uid ? g.blackName || g.black : g.whiteName || g.white || intl.formatMessage({ id: 'history.unknown', defaultMessage: 'Guest' }),
									}}
								/>
							</span>
							<span className='text-muted' style={{ fontSize: 12 }}>{g.createdAt?.toDate ? g.createdAt.toDate().toLocaleString() : ''}</span>
						</div>
					</Link>
				))}
			</div>
		</div>
	);
}
