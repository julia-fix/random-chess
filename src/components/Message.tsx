import React from 'react';
import msgStyle from '../scss/Message.module.scss';
import classNames from 'classnames';
import Avatar from './Avatar';
import UserName from './UserName';
import { Timestamp } from 'firebase/firestore';
import { FormattedDate, FormattedTime } from 'react-intl';

interface MessageProps {
	message: {
		text: string;
		author: {
			displayName: string | null;
			photoURL: string | null;
			uid: string;
			isAnonymous: boolean;
		};

		createdAt: Timestamp;
	};
	position: 'left' | 'right';
}

export default function Message({ message, position }: MessageProps) {
	return (
		<div className={classNames(msgStyle.container, msgStyle[position])}>
			<div className={classNames(msgStyle.box, msgStyle[position])}>
				<div className={msgStyle.message}>{message.text}</div>
				<div className={msgStyle.meta}>
					<div className={msgStyle.username}>
						<UserName user={message.author} />
					</div>
					<div className={msgStyle.date}>
						<FormattedDate value={message.createdAt.toDate()} /> <FormattedTime value={message.createdAt.toDate()} />
					</div>
				</div>
			</div>
			<div className={msgStyle.avatar}>
				<Avatar url={message.author.photoURL} size={25} />
			</div>
		</div>
	);
}
