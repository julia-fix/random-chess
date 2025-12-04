import { useState, useEffect, useContext, useCallback } from 'react';
import { Offcanvas } from 'react-bootstrap';
import { doc, onSnapshot, DocumentReference, Unsubscribe, updateDoc, arrayUnion, runTransaction } from 'firebase/firestore';
import { db } from '../utils/firebase';
import { UserContext } from '../contexts/UserContext';
import { v4 as uuid } from 'uuid';
import Message from './Message';
import ChatLayout from './ChatLayout';
import ChatInput from './ChatInput';
import chatStyle from '../scss/Chat.module.scss';
import { FormattedMessage } from 'react-intl';

export default function GameChat({ gameId }: { gameId: string }) {
	const [show, setShow] = useState(false);
	const [messages, setMessages] = useState<any[]>();
	const [unreadCounter, setUnreadCounter] = useState(0);
	const [loading, setLoading] = useState(true);
	const [error, setError] = useState<string | null>(null);
	const user = useContext(UserContext);
	const [messagesRef, setMessagesRef] = useState<DocumentReference>();

	const handleClose = () => setShow(false);
	const handleShow = () => setShow(true);

	useEffect(() => {
		let unsubGameChat: Unsubscribe;
		const chatRef = doc(db, 'chats', gameId);

		setMessagesRef(chatRef);
		unsubGameChat = onSnapshot(
			chatRef,
			(chatSnap) => {
				const data = chatSnap.data();
				if (data) {
					setMessages(data.messages);
					setUnreadCounter(data.unread[user.uid as string] || 0);
				} else {
					setMessages([]);
					setUnreadCounter(0);
				}
				setLoading(false);
				setError(null);
			},
			(err) => {
				setError(err.message);
				setLoading(false);
			}
		);

		return () => {
			unsubGameChat && unsubGameChat();
		};
	}, [gameId, user.uid]);

	const resetUnread = useCallback(async () => {
		if (messagesRef) {
			try {
				await runTransaction(db, async (transaction) => {
					const chatDoc = await transaction.get(messagesRef);
					if (!chatDoc.exists()) {
						throw new Error('Document chatDoc does not exist!');
					}

					let oldUnread = chatDoc.data().unread;

					let newUnread = { ...oldUnread, [user.uid as string]: 0 };
					if (oldUnread[user.uid as string] !== 0) {
						transaction.update(messagesRef, { unread: newUnread });
					} else {
						throw new Error('Counter is already set to 0!');
					}
				});
				// console.log('resetUnread: Transaction successfully committed!');
			} catch (e) {
				// console.log('resetUnread: Transaction failed: ', e);
			}
		}
	}, [messagesRef, user.uid]);

	useEffect(() => {
		if (show) {
			resetUnread();
		}
	}, [show, messages, resetUnread]);

	const sendMessage = async (text: string) => {
		if (!text.trim()) return;
		if (messagesRef) {
			await updateDoc(messagesRef, {
				messages: arrayUnion({
					createdAt: new Date(),
					text,
					msgId: uuid(),
					author: {
						uid: user.uid,
						displayName: user.displayName,
						photoURL: user.photoURL,
						isAnonymous: user.isAnonymous,
					},
				}),
			});

			try {
				await runTransaction(db, async (transaction) => {
					const chatDoc = await transaction.get(messagesRef);
					if (!chatDoc.exists()) {
						throw new Error('Document does not exist!');
					}

					let newUnread = { ...chatDoc.data().unread };
					let hasNewData = false;
					for (let playerId in newUnread) {
						if (playerId !== user.uid) {
							newUnread[playerId]++;
							hasNewData = true;
						}
					}

					if (hasNewData) {
						transaction.update(messagesRef, { unread: newUnread });
					} else {
						throw new Error('sendMessage: No new data to update!');
					}
				});
				// console.log('sendMessage: Transaction successfully committed!');
			} catch (e) {
				// console.log('sendMessage: Transaction failed: ', e);
			}
		}
	};

	return (
		<>
			<div className={chatStyle.floatButton} onClick={handleShow}>
				<img src='/chess/images/chat.svg' alt='Chat' />
				{unreadCounter ? <div className={chatStyle.counter}>{unreadCounter}</div> : null}
				{/* <div className={chatStyle.counter}>{unreadCounter}</div> */}
			</div>

			<Offcanvas show={show} onHide={handleClose}>
				<Offcanvas.Header closeButton className='mob-nav-dark'>
					<Offcanvas.Title>
						<FormattedMessage id='game_chat' />
					</Offcanvas.Title>
				</Offcanvas.Header>
				<Offcanvas.Body className='mob-nav-dark'>
					{loading && <div className='text-muted'><FormattedMessage id='waiting' /></div>}
					{error && <div className='text-danger'>{error}</div>}
					{!loading && !error && (
						<ChatLayout
							messages={
								messages &&
								messages.map((message) => (
									<div key={message.msgId}>
										<Message message={message} position={message.author.uid === user.uid ? 'right' : 'left'} />
									</div>
								))
							}
							input={<ChatInput sendMessage={sendMessage} />}
							msgCount={messages ? messages.length : 0}
						/>
					)}
				</Offcanvas.Body>
			</Offcanvas>
		</>
	);
}
