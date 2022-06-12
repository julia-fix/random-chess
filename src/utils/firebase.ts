import firebase from 'firebase/compat/app';
import 'firebase/compat/auth';
import 'firebase/compat/firestore';

const firebaseConfig = {
	apiKey: process.env.REACT_APP_FIREBASE_apiKey,
	authDomain: process.env.REACT_APP_FIREBASE_authDomain,
	projectId: process.env.REACT_APP_FIREBASE_projectId,
	storageBucket: process.env.REACT_APP_FIREBASE_storageBucket,
	messagingSenderId: process.env.REACT_APP_FIREBASE_messagingSenderId,
	appId: process.env.REACT_APP_FIREBASE_appId,
	measurementId: process.env.REACT_APP_FIREBASE_measurementId,
};

// Initialize Firebase and Firestore
const app = firebase.initializeApp(firebaseConfig);

const db = firebase.firestore(app);
export { db };
export const auth = firebase.auth();
