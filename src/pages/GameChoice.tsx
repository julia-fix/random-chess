import { FormattedMessage } from 'react-intl';
import CreateGame from '../components/CreateGame';
import LangLink from '../components/LangLink';

export default function GameChoice() {
	return (
		<>
			<h1 style={{ margin: '40px 0' }}>
				<FormattedMessage id='choose_mode' />
			</h1>
			<div className='d-grid gap-4'>
				<CreateGame>
					<FormattedMessage id='play_with_friend' />
				</CreateGame>
				<LangLink to='/single' className='btn btn-lg btn-primary'>
					<FormattedMessage id='single_player' />
				</LangLink>
			</div>
		</>
	);
}
