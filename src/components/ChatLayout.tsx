import { ReactNode, useRef, useEffect } from 'react';
import layoutStyle from '../scss/ChatLayout.module.scss';

export default function GameLayout({ messages, input, msgCount }: { messages: ReactNode; input: ReactNode; msgCount: number }) {
	useEffect(() => {
		if (messagesRef.current) {
			const { scrollTop, scrollHeight, clientHeight } = messagesRef.current;
			if (scrollHeight - scrollTop - clientHeight < 250) {
				messagesRef.current.scrollTo({
					top: scrollHeight,
					behavior: 'smooth',
				});
			}
		}
	}, [msgCount]);

	useEffect(() => {
		if (messagesRef.current) {
			const { scrollHeight } = messagesRef.current;
			messagesRef.current.scrollTo(0, scrollHeight);
		}
	}, []);

	const messagesRef = useRef<HTMLDivElement>(null);

	return (
		<div className={layoutStyle.container}>
			<div className={layoutStyle.messages} ref={messagesRef}>
				{messages}
			</div>
			<div className={layoutStyle.input}>{input}</div>
		</div>
	);
}
