import inputStyle from '../scss/ChatInput.module.scss';
import { useIntl } from 'react-intl';

export default function ChatInput({ sendMessage }: { sendMessage: (text: string) => Promise<void> }) {
	const intl = useIntl();
	const onSubmit = (e: any) => {
		e.preventDefault();
		const text = (e.target.elements.text.value as string).trim();
		if (!text) return;
		sendMessage(text);
		e.target.elements.text.value = '';
	};
	return (
		<form onSubmit={onSubmit} className={inputStyle.container}>
			<input
				type='text'
				name='text'
				id='text'
				placeholder={intl.formatMessage({
					id: 'enter_message',
				})}
				className={inputStyle.input}
			/>
			<button type='submit' className={inputStyle.button}>
				<img src='/chess/images/right-arrow.svg' alt='Send' />
			</button>
		</form>
	);
}
