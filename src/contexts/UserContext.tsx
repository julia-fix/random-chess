// Logged in user context
import { auth } from '../utils/firebase';
import { useEffect, useState, createContext } from 'react';
import { setDoc, doc, getDoc, updateDoc } from 'firebase/firestore';
import { db } from '../utils/firebase';

export interface UserProps {
	loggedIn?: boolean;
	displayName: string | null;
	loading?: boolean;
	isAnonymous: boolean;
	photoURL: string | null;
	uid: string | null;
	emailVerified?: boolean;
}

const initialValue: UserProps = {
	loggedIn: false,
	displayName: null,
	loading: true,
	isAnonymous: true,
	photoURL: null,
	uid: null,
	emailVerified: undefined,
};

export const UserContext = createContext<UserProps>(initialValue);

export default function UserProvider({ children }: { children: React.ReactNode }) {
	const [user, setUser] = useState<UserProps>(initialValue);

	useEffect(() => {
		const updateUser = async (user: UserProps) => {
			if (!user.uid) return;
			const docRef = doc(db, 'players', user.uid);
			try {
				const docSnap = await getDoc(docRef);

				if (docSnap.exists()) {
					// Update missing displayName if it was added later (e.g., after signup)
					const storedName = docSnap.data().displayName;
					if (!storedName && user.displayName) {
						await updateDoc(docRef, { displayName: user.displayName });
					}
					return;
				}

				await setDoc(docRef, {
					displayName: user.displayName,
					isAnonymous: user.isAnonymous,
					photoURL: user.photoURL,
					uid: user.uid,
				});
			} catch (e) {
				console.error('[UserContext] Failed to sync player doc', { uid: user.uid, displayName: user.displayName }, e);
			}
		};

		const unsubscribe = auth.onAuthStateChanged(
			async (user) => {
				if (user) {
					// Pull displayName from players doc if missing (e.g., after guest → email signup)
					let effectiveName = user.displayName;
					if (!effectiveName) {
						try {
							const docRef = doc(db, 'players', user.uid);
							const snap = await getDoc(docRef);
							if (snap.exists()) {
								const data = snap.data() as any;
								effectiveName = data.displayName || null;
							}
						} catch {
							// ignore lookup errors
						}
					}
					if (!effectiveName && user.email) {
						effectiveName = user.email.split('@')[0];
					}
					const toUpdate = {
						displayName: effectiveName,
						loggedIn: true,
						loading: false,
						isAnonymous: user.isAnonymous,
						photoURL: user.photoURL,
						uid: user.uid,
						emailVerified: user.emailVerified ?? true,
					};
					setUser(toUpdate);
					updateUser(toUpdate);
				} else {
					setUser({
						displayName: null,
						loggedIn: false,
						loading: false,
						isAnonymous: true,
						photoURL: null,
						uid: null,
						emailVerified: undefined,
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
