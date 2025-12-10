import { useEffect, useMemo, useState } from 'react';
import { useParams } from 'react-router-dom';
import { doc, getDoc } from 'firebase/firestore';
import { db } from '../utils/firebase';
import Board from '../components/Board';
import GameRulesModal from '../components/GameRulesModal';
import { FormattedMessage, useIntl } from 'react-intl';

export default function HistoryGame() {
	const { gameId } = useParams<{ gameId: string }>();
	const [moves, setMoves] = useState<any[]>([]);
	const [players, setPlayers] = useState<{ w: string | null; b: string | null }>({ w: null, b: null });
	const [gameStatus, setGameStatus] = useState<'finished' | 'waiting' | 'playing'>('finished');
	const [winner, setWinner] = useState<'w' | 'b' | null>(null);
	const [resultReason, setResultReason] = useState<any>();
	const [showRules, setShowRules] = useState(false);
	const intl = useIntl();

	useEffect(() => {
		const load = async () => {
			if (!gameId) return;
			const movesSnap = await getDoc(doc(db, 'gameMoves', gameId));
			const gameSnap = await getDoc(doc(db, 'games', gameId));
			const dataSnap = await getDoc(doc(db, 'gameData', gameId));
			if (movesSnap.exists()) {
				setMoves(((movesSnap.data() as any).moves as any[]) || []);
			}
			if (gameSnap.exists()) {
				const g = gameSnap.data() as any;
				setPlayers({ w: g.white ?? null, b: g.black ?? null });
			}
			if (dataSnap.exists()) {
				const d = dataSnap.data() as any;
				if (d.status) setGameStatus(d.status);
				if (d.winner !== undefined) setWinner(d.winner ?? null);
				if (d.resultReason) setResultReason(d.resultReason);
			}
		};
		load();
	}, [gameId]);

	const labels = useMemo(
		() => ({
			w: intl.formatMessage({ id: 'player.white', defaultMessage: 'White' }),
			b: intl.formatMessage({ id: 'player.black', defaultMessage: 'Black' }),
		}),
		[intl]
	);

	return (
		<div style={{ paddingTop: 20 }}>
			<h3 className='mb-3'>
				<FormattedMessage id='history.game' defaultMessage='Game history' /> {gameId}
			</h3>
			<Board
				mode='multi'
				role='spectator'
				color='w'
				gameStatus='finished'
				moveList={moves}
				winner={winner}
				resultReason={resultReason}
				playerLabels={labels}
				players={players}
				onShowRules={() => setShowRules(true)}
			/>
			<GameRulesModal show={showRules} onHide={() => setShowRules(false)} />
		</div>
	);
}
