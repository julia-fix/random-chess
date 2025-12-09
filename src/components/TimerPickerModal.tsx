import { Modal, Button } from 'react-bootstrap';
import { FormattedMessage } from 'react-intl';

type TimerOption = { label: string; value: number };

type Props = {
	show: boolean;
	options: TimerOption[];
	selected?: number;
	onSelect: (value: number) => void;
	onClose: () => void;
};

export default function TimerPickerModal({ show, options, selected, onSelect, onClose }: Props) {
	return (
		<Modal show={show} onHide={onClose} centered>
			<Modal.Header closeButton>
				<Modal.Title>
					<FormattedMessage id='play_with_friend' />
				</Modal.Title>
			</Modal.Header>
			<Modal.Body>
				<div style={{ textAlign: 'center', marginBottom: 12, fontSize: 14, opacity: 0.8 }}>
					<FormattedMessage id='timer' defaultMessage='Timer' />
				</div>
				<div style={{ display: 'grid', gridTemplateColumns: 'repeat(2, minmax(120px, 1fr))', gap: 12 }}>
					{options.map((opt, idx) => {
						const isLast = idx === options.length - 1;
						const isSelected = opt.value === selected;
						return (
							<button
								key={opt.value}
								type='button'
								className={`btn ${isSelected ? 'btn-primary' : 'btn-outline-secondary'}`}
								style={{
									padding: '12px 8px',
									fontWeight: 600,
									gridColumn: isLast ? '1 / span 2' : undefined,
								}}
								onClick={() => onSelect(opt.value)}
							>
								{opt.label}
							</button>
						);
					})}
				</div>
			</Modal.Body>
			<Modal.Footer>
				<Button variant='secondary' onClick={onClose}>
					<FormattedMessage id='cancel' defaultMessage='Cancel' />
				</Button>
			</Modal.Footer>
		</Modal>
	);
}
