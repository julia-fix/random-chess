import { useEffect, useState, useContext, useMemo } from 'react';
import { collection, getDocs, query, where, doc, getDoc } from 'firebase/firestore';
import { db } from '../utils/firebase';
import { Link } from 'react-router-dom';
import { FormattedMessage, useIntl } from 'react-intl';
import { UserContext } from '../contexts/UserContext';

type GameRow = {
	id: string;
	createdAt?: any;
	white?: string | null;
	black?: string | null;
	opponentName?: string;
	opponentId?: string | null;
};

export default function HistoryList() {
	const user = useContext(UserContext);
	const [games, setGames] = useState<GameRow[]>([]);
	const [loading, setLoading] = useState(true);
	const intl = useIntl();

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
				const [whiteSnap, blackSnap] = await Promise.all([getDocs(query(gamesRef, where('white', '==', uid))), getDocs(query(gamesRef, where('black', '==', uid)))]);
				const rows: GameRow[] = [];
				whiteSnap.forEach((doc) => rows.push({ id: doc.id, ...(doc.data() as any) }));
				blackSnap.forEach((doc) => {
					if (!rows.find((r) => r.id === doc.id)) rows.push({ id: doc.id, ...(doc.data() as any) });
				});
				// fetch opponent names
				const uniqueOpponents = Array.from(
					new Set(
						rows
							.map((g) => (g.white === uid ? g.black : g.white))
							.filter((x): x is string => !!x)
					)
				);
				const opponentMap: Record<string, string> = {};
				await Promise.all(
					uniqueOpponents.map(async (oid) => {
						try {
							const snap = await getDoc(doc(db, 'players', oid));
							if (snap.exists()) {
								const data = snap.data() as any;
								opponentMap[oid] = data.displayName || data.email || oid;
							} else {
								opponentMap[oid] = oid;
							}
						} catch {
							opponentMap[oid] = oid;
						}
					})
				);
				const withNames = rows.map((g) => {
					const opp = g.white === uid ? g.black : g.white;
					return { ...g, opponentId: opp ?? null, opponentName: opp ? opponentMap[opp] || opp : undefined };
				});
				rows.sort((a, b) => (b.createdAt?.seconds || 0) - (a.createdAt?.seconds || 0));
				setGames(withNames);
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
										name: g.opponentName
											? g.opponentName
											: g.opponentId
											? g.opponentId
											: `${intl.formatMessage({ id: 'history.unknown', defaultMessage: 'Guest' })}`,
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
