import { useState, useEffect, useContext, useCallback, useMemo } from 'react';
import { Offcanvas } from 'react-bootstrap';
import { doc, onSnapshot, DocumentReference, Unsubscribe, updateDoc, arrayUnion, runTransaction, setDoc } from 'firebase/firestore';
import { db } from '../utils/firebase';
import { UserContext } from '../contexts/UserContext';
import { v4 as uuid } from 'uuid';
import Message from './Message';
import ChatLayout from './ChatLayout';
import ChatInput from './ChatInput';
import chatStyle from '../scss/Chat.module.scss';
import { FormattedMessage } from 'react-intl';
import { withBase } from '../utils/paths';
import { logWrite } from '../utils/fbLogger';
import { ttlExpiresAt } from '../utils/ttl';

type Props = {
	gameId: string;
	gameDataRef?: DocumentReference;
	players?: { w: string | null; b: string | null };
	unreadCount?: number;
};

export default function GameChat({ gameId, gameDataRef, players, unreadCount = 0 }: Props) {
	const [show, setShow] = useState(false);
	const [messages, setMessages] = useState<any[]>();
	const [loading, setLoading] = useState(true);
	const [error, setError] = useState<string | null>(null);
	const user = useContext(UserContext);
	const [messagesRef, setMessagesRef] = useState<DocumentReference>();

	const handleClose = () => setShow(false);
	const handleShow = () => setShow(true);

	useEffect(() => {
		let unsubGameChat: Unsubscribe;
		let creating = false;
		const chatRef = doc(db, 'chats', gameId);

		setMessagesRef(chatRef);
		if (!show) {
			return () => {
				unsubGameChat && unsubGameChat();
			};
		}
		setLoading(true);
		setError(null);
		unsubGameChat = onSnapshot(
			chatRef,
			(chatSnap) => {
				const data = chatSnap.data();
				if (data) {
					setMessages(data.messages);
				} else {
					setMessages([]);
					if (!creating) {
						creating = true;
						setDoc(chatRef, { gameId, messages: [], createdAt: new Date(), expiresAt: ttlExpiresAt() }, { merge: true }).catch(() => {
							creating = false;
						});
					}
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
	}, [gameId, show]);

	const resetUnread = useCallback(async () => {
		if (gameDataRef && user.uid) {
			try {
				await updateDoc(gameDataRef, { [`unreadByUid.${user.uid}`]: 0 });
			} catch (e) {
				// console.log('resetUnread: Transaction failed: ', e);
			}
		}
	}, [gameDataRef, user.uid]);

	useEffect(() => {
		if (show) {
			resetUnread();
		}
	}, [show, messages, resetUnread]);

	const recipientIds = useMemo(() => {
		const ids = [players?.w, players?.b].filter(Boolean) as string[];
		return Array.from(new Set(ids)).filter((id) => id !== user.uid);
	}, [players?.w, players?.b, user.uid]);

	const sendMessage = async (text: string) => {
		if (!text.trim()) return;
		if (messagesRef) {
			await logWrite(
				'chat:sendMessage',
				messagesRef,
				{ text },
				() =>
					updateDoc(messagesRef, {
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
						expiresAt: ttlExpiresAt(),
					})
			);

			try {
				if (gameDataRef && recipientIds.length) {
					await runTransaction(db, async (transaction) => {
						const gameDataSnap = await transaction.get(gameDataRef);
						const current = (gameDataSnap.data()?.unreadByUid as Record<string, number>) || {};
						const next = { ...current };
						recipientIds.forEach((id) => {
							next[id] = (next[id] || 0) + 1;
						});
						transaction.update(gameDataRef, { unreadByUid: next });
					});
				}
			} catch (e) {
				// console.log('sendMessage: Transaction failed: ', e);
			}
		}
	};

	return (
		<>
			<div className={chatStyle.floatButton} onClick={handleShow}>
				<img src={withBase('images/chat.svg')} alt='Chat' />
				{unreadCount ? <div className={chatStyle.counter}>{unreadCount}</div> : null}
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
