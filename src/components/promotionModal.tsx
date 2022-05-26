import React from 'react';
import { GiChessQueen, GiChessKnight, GiChessBishop, GiChessRook } from 'react-icons/gi';
import { Modal, ModalBody, Button } from 'react-bootstrap';
import { create, InstanceProps } from 'react-modal-promise';

export interface ModalTypes {
	title: string;
	text: string;
}

const MyBootrapModal: React.FC<ModalTypes & InstanceProps<unknown>> = ({ isOpen, onResolve, onReject }) => {
	const submit = (piece: string) => onResolve(piece);
	const reject = () => onReject('rejected!!!');
	// console.log('myBootstrapModal', isOpen, onResolve, onReject, text, title);

	return (
		<Modal show={isOpen} onHide={reject} centered>
			<ModalBody style={{ textAlign: 'center' }}>
				<Button
					variant='outline-primary'
					style={{ padding: '0 10px', lineHeight: '40px', fontSize: '40px', border: 'none' }}
					size='lg'
					onClick={() => {
						submit('q');
					}}
				>
					<GiChessQueen />
				</Button>{' '}
				<Button
					variant='outline-primary'
					style={{ padding: '0 10px', lineHeight: '40px', fontSize: '40px', border: 'none' }}
					size='lg'
					onClick={() => {
						submit('r');
					}}
				>
					<GiChessRook />
				</Button>{' '}
				<Button
					variant='outline-primary'
					style={{ padding: '0 10px', lineHeight: '40px', fontSize: '40px', border: 'none' }}
					size='lg'
					onClick={() => {
						submit('b');
					}}
				>
					<GiChessBishop />
				</Button>{' '}
				<Button
					variant='outline-primary'
					style={{ padding: '0 10px', lineHeight: '40px', fontSize: '40px', border: 'none' }}
					size='lg'
					onClick={() => {
						submit('n');
					}}
				>
					<GiChessKnight />
				</Button>
			</ModalBody>
		</Modal>
	);
};

/**
 * Modal for selecting pawn promotion piece
 */
export const promotionModal = create(MyBootrapModal);
