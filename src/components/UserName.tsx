import React from 'react';
import { FormattedMessage } from 'react-intl';
import { UserProps } from '../contexts/UserContext';

interface UserNameProps {
	user: UserProps;
}

export default function UserName({ user }: UserNameProps) {
	return <>{user.displayName ? user.displayName : <FormattedMessage id={user.isAnonymous ? 'guest' : 'no_name'} />}</>;
}
