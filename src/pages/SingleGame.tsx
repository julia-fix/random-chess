import Board from '../components/Board';
import { useState } from 'react';
import GameRulesModal from '../components/GameRulesModal';
import { useIntl } from 'react-intl';
import usePageMeta from '../hooks/usePageMeta';

function SingleGame() {
	const [showRules, setShowRules] = useState(false);
	const intl = useIntl();
	usePageMeta({
		titleId: 'meta.title.single_player',
		titleDefault: 'Single Player | Random Chess',
		descriptionId: 'meta.desc.single_player',
		descriptionDefault: 'Play a local Random Chess game with full card rules and timers.',
	});

	return (
		<div style={{ paddingTop: 20 }}>
			<Board
				mode='single'
				onShowRules={() => setShowRules(true)}
				playerLabels={{ w: intl.formatMessage({ id: 'player.white', defaultMessage: 'White' }), b: intl.formatMessage({ id: 'player.black', defaultMessage: 'Black' }) }}
			/>
			<GameRulesModal show={showRules} onHide={() => setShowRules(false)} />
		</div>
	);
}

export default SingleGame;
