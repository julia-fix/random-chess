// Logged in user context
import { auth } from '../utils/firebase';
import { useEffect, useState, createContext } from 'react';
import { setDoc, doc, getDoc } from 'firebase/firestore';
import { db } from '../utils/firebase';

export interface UserProps {
	loggedIn?: boolean;
	displayName: string | null;
	loading?: boolean;
	isAnonymous: boolean;
	photoURL: string | null;
	uid: string | null;
}

const initialValue: UserProps = {
	loggedIn: false,
	displayName: null,
	loading: true,
	isAnonymous: true,
	photoURL: null,
	uid: null,
};

export const UserContext = createContext<UserProps>(initialValue);

export default function UserProvider({ children }: { children: React.ReactNode }) {
	const [user, setUser] = useState<UserProps>(initialValue);

	useEffect(() => {
		const updateUser = async (user: UserProps) => {
			if (user.uid) {
				const docRef = doc(db, 'players', user.uid);
				const docSnap = await getDoc(docRef);

				if (docSnap.exists()) {
					// console.log('Document exist!');
					return;
				} else {
					await setDoc(docRef, {
						displayName: user.displayName,
						isAnonymous: user.isAnonymous,
						photoURL: user.photoURL,
						uid: user.uid,
					});
				}
			}
		};

		const unsubscribe = auth.onAuthStateChanged(
			(user) => {
				if (user) {
					// console.log('User is signed in.', user);
					const toUpdate = {
						displayName: user.displayName,
						loggedIn: true,
						loading: false,
						isAnonymous: user.isAnonymous,
						photoURL: user.photoURL,
						uid: user.uid,
					};
					setUser(toUpdate);
					updateUser(toUpdate);
				} else {
					// console.log('No user is signed in.');
					setUser({
						displayName: null,
						loggedIn: false,
						loading: false,
						isAnonymous: true,
						photoURL: null,
						uid: null,
					});
				}
			},
			(error) => {
				console.log(error);
			}
		);
		return () => unsubscribe();
	}, []);

	return <UserContext.Provider value={user}>{children}</UserContext.Provider>;
}
