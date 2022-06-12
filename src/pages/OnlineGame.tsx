import { useParams } from 'react-router';
import PlayGame from './PlayGame';

export default function OnlineGame() {
	// const [gameId, setGameId] = useState<string>(useParams<{ gameId: string }>().gameId || '');
	let { gameId } = useParams();

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
