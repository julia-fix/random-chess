import CreateGame from '../components/CreateGame';
import { FormattedMessage } from 'react-intl';
import usePageMeta from '../hooks/usePageMeta';
export default function PlayGameIndex() {
	usePageMeta({
		titleId: 'meta.title.play_index',
		titleDefault: 'Create Game | Random Chess',
		descriptionId: 'meta.desc.play_index',
		descriptionDefault: 'Start a new online game and get a shareable invite link.',
	});
	return (
		<div>
			<CreateGame>
				<FormattedMessage id='play_with_friend' />
			</CreateGame>
		</div>
	);
}
