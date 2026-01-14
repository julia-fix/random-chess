import { FormattedMessage } from 'react-intl';
import CreateGame from '../components/CreateGame';
import LangLink from '../components/LangLink';
import { useState } from 'react';
import GameRulesModal from '../components/GameRulesModal';
import usePageMeta from '../hooks/usePageMeta';

export default function GameChoice() {
	const [showRules, setShowRules] = useState(false);
	usePageMeta({
		titleId: 'meta.title.choose_mode',
		titleDefault: 'Choose Mode | Random Chess',
		descriptionId: 'meta.desc.choose_mode',
		descriptionDefault: 'Pick a mode, review the rules, and start a Random Chess game with friends, solo, or against the computer.',
	});

	return (
		<>
			<h1 style={{ margin: '40px 0' }}>
				<FormattedMessage id='choose_mode' />
			</h1>
			<div className='d-grid gap-3'>
				<CreateGame buttonVariant='primary' buttonSize='lg' classes='w-100'>
					<FormattedMessage id='play_with_friend' />
				</CreateGame>
				<LangLink to='/single' className='btn btn-lg btn-primary w-100'>
					<FormattedMessage id='single_player' />
				</LangLink>
				<LangLink to='/computer' className='btn btn-lg btn-primary w-100'>
					<FormattedMessage id='play_computer' defaultMessage='Play with computer' />
				</LangLink>
				<button className='btn btn-lg btn-outline-light w-100' onClick={() => setShowRules(true)}>
					<FormattedMessage id='game_rules' defaultMessage='Game rules' />
				</button>
			</div>
			<GameRulesModal show={showRules} onHide={() => setShowRules(false)} />
		</>
	);
}
