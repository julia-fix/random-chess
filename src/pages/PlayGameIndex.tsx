import CreateGame from '../components/CreateGame';
import { FormattedMessage } from 'react-intl';
export default function PlayGameIndex() {
	return (
		<div>
			<CreateGame>
				<FormattedMessage id='play_with_friend' />
			</CreateGame>
		</div>
	);
}
