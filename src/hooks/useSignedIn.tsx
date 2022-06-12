// react hook that checks if user is authorized in firebase
import { auth } from '../utils/firebase';
import { useEffect, useState } from 'react';
import { useCallback } from 'react';

export const useIsLoggedIn = () => {
	const [user, setUser] = useState<{
		displayName: string | null;
		loggedIn: boolean;
		loading: boolean;
	}>({
		displayName: null,
		loggedIn: false,
		loading: true,
	});

	const checkIsLoggedIn = useCallback(async () => {
		try {
			await new Promise((resolve, reject) =>
				auth.onAuthStateChanged(
					(user) => {
						if (user) {
							// console.log('User is signed in.', user);
							setUser({
								displayName: user.displayName,
								loggedIn: true,
								loading: false,
							});
							resolve(user);
						} else {
							// console.log('No user is signed in.');
							setUser({
								displayName: null,
								loggedIn: false,
								loading: false,
							});
							reject('no user logged in');
						}
					},
					// Prevent console error
					(error) => reject(error)
				)
			);
		} catch (error) {
			console.log(error);
		}
	}, []);

	useEffect(() => {
		checkIsLoggedIn();
	}, [checkIsLoggedIn]);

	return user;
};
