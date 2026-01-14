import { useParams } from 'react-router';
import PlayGame from './PlayGame';
import usePageMeta from '../hooks/usePageMeta';

export default function OnlineGame() {
	// const [gameId, setGameId] = useState<string>(useParams<{ gameId: string }>().gameId || '');
	let { gameId } = useParams();
	usePageMeta({
		titleId: 'meta.title.play_friend',
		titleDefault: 'Play with Friend | Random Chess',
		descriptionId: 'meta.desc.play_friend',
		descriptionDefault: 'Create or join an online game, share the invite link, and chat live while you play.',
	});

	return (
		<>
			{gameId && (
				<>
					<PlayGame key={gameId} />
				</>
			)}
		</>
	);
}
