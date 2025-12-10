import { Modal, Button } from 'react-bootstrap';
import { FormattedMessage, useIntl } from 'react-intl';
import { numbers, letters, pieces, moves as moveCards } from '../utils/cardsList';

const CardsList = () => {
	const uniqueCards = [
		...numbers.map((n) => n.toString()),
		...letters,
		...pieces,
		'p',
		...moveCards,
	];

	return (
		<div className='cards-grid'>
			{uniqueCards.map((c) => (
				<span key={c} className='move-card'>
					{c}
				</span>
			))}
		</div>
	);
};

type Props = {
	show: boolean;
	onHide: () => void;
};

export default function GameRulesModal({ show, onHide }: Props) {
	const intl = useIntl();
	const cardDescriptions: Array<{ label: string; detailId: string; exampleId?: string }> = [
		{ label: '1-8', detailId: 'rules.detail.rank', exampleId: 'rules.example.rank' },
		{ label: 'a-h', detailId: 'rules.detail.file', exampleId: 'rules.example.file' },
		{ label: intl.formatMessage({ id: 'rules.label.pieces', defaultMessage: 'R, N, B, Q, K' }), detailId: 'rules.detail.pieces', exampleId: 'rules.example.pieces' },
		{ label: intl.formatMessage({ id: 'rules.label.pawn', defaultMessage: 'p' }), detailId: 'rules.detail.pawn', exampleId: 'rules.example.pawn' },
		{ label: intl.formatMessage({ id: 'rules.label.take', defaultMessage: 'take' }), detailId: 'rules.detail.take', exampleId: 'rules.example.take' },
		{ label: intl.formatMessage({ id: 'rules.label.check', defaultMessage: 'check' }), detailId: 'rules.detail.check', exampleId: 'rules.example.check' },
		{ label: intl.formatMessage({ id: 'rules.label.stalemate', defaultMessage: 'stalemate' }), detailId: 'rules.detail.stalemate', exampleId: 'rules.example.stalemate' },
		{ label: intl.formatMessage({ id: 'rules.label.any', defaultMessage: 'any' }), detailId: 'rules.detail.any', exampleId: 'rules.example.any' },
		{ label: intl.formatMessage({ id: 'rules.label.castling', defaultMessage: 'Castling squares' }), detailId: 'rules.detail.castling', exampleId: 'rules.example.castling' },
	];
	return (
		<Modal show={show} onHide={onHide} centered>
			<Modal.Header closeButton>
				<Modal.Title>
					<FormattedMessage id='rules.title' defaultMessage='Random Chess Rules' />
				</Modal.Title>
			</Modal.Header>
			<Modal.Body>
				<ul className='mb-3'>
					<li>
						<FormattedMessage id='rules.point.classic' defaultMessage='Classic chess pieces and board.' />
					</li>
					<li>
						<FormattedMessage id='rules.point.card' defaultMessage='Each turn you draw a card; your move must be legal in chess and satisfy that card.' />
					</li>
					<li>
						<FormattedMessage id='rules.point.redraw' defaultMessage='If no legal move fits the card, a new card is drawn.' />
					</li>
				</ul>
				<h6>
					<FormattedMessage id='rules.cards_heading' defaultMessage='Cards in the deck' />
				</h6>
				<CardsList />
				<div className='mt-3 d-grid gap-2'>
					{cardDescriptions.map((item) => (
						<div key={item.label} className='card-line'>
							<div>
								<strong>{item.label}:</strong>{' '}
								<span className='text-muted'>{intl.formatMessage({ id: item.detailId })}</span>
							</div>
							{item.exampleId && (
								<div className='text-muted' style={{ fontSize: 13 }}>
									<em>{intl.formatMessage({ id: item.exampleId })}</em>
								</div>
							)}
						</div>
					))}
				</div>
				<p className='mb-0 mt-3 text-muted'>
					<FormattedMessage
						id='rules.tip'
						defaultMessage='Tip: Think ahead and keep your pieces positioned so they cannot reach risky squares, reducing the chance of being forced into a bad move when a matching card appears.'
					/>
				</p>
			</Modal.Body>
			<Modal.Footer>
				<Button variant='secondary' onClick={onHide}>
					<FormattedMessage id='rules.close' defaultMessage='Close' />
				</Button>
			</Modal.Footer>
		</Modal>
	);
}
