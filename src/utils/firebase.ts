import { initializeApp } from "firebase/app";
import { initializeAppCheck, ReCaptchaEnterpriseProvider } from "firebase/app-check";
import { getAuth } from "firebase/auth";
import * as Firestore from "firebase/firestore";
// optional if you use analytics:
// import { getAnalytics } from "firebase/analytics";

const firebaseConfig = {
	apiKey: import.meta.env.VITE_FIREBASE_apiKey,
	authDomain: import.meta.env.VITE_FIREBASE_authDomain,
	projectId: import.meta.env.VITE_FIREBASE_projectId,
	storageBucket: import.meta.env.VITE_FIREBASE_storageBucket,
	messagingSenderId: import.meta.env.VITE_FIREBASE_messagingSenderId,
	appId: import.meta.env.VITE_FIREBASE_appId,
	measurementId: import.meta.env.VITE_FIREBASE_measurementId,
};

// Initialize Firebase
const app = initializeApp(firebaseConfig);

// Services
export const auth = getAuth(app);
export const db = Firestore.getFirestore(app);

// App Check with reCAPTCHA Enterprise
const appCheckKey = import.meta.env.VITE_APP_CHECK_SITE_KEY;
if (appCheckKey) {
	try {
		// Optional debug token for local/dev: set VITE_APP_CHECK_DEBUG_TOKEN
		const debugToken = import.meta.env.VITE_APP_CHECK_DEBUG_TOKEN;
		if (debugToken && typeof window !== 'undefined') {
			// @ts-ignore allow debug token injection
			self.FIREBASE_APPCHECK_DEBUG_TOKEN = debugToken;
		}
		initializeAppCheck(app, {
			provider: new ReCaptchaEnterpriseProvider(appCheckKey),
			isTokenAutoRefreshEnabled: true,
		});
	} catch (e) {
		console.warn('App Check initialization failed; continuing without App Check', e);
	}
}

// Verbose Firestore logging in development to trace permission issues
// Guarded to work with test mocks that may not include setLogLevel.
// Disable noisy Firestore logs to avoid console spam.
try {
	const maybeSetLogLevel = (Firestore as any).setLogLevel;
	if (typeof maybeSetLogLevel === 'function') {
		maybeSetLogLevel('error');
	}
} catch (e) {
	// ignore missing setLogLevel in test mocks
}
// export const analytics = getAnalytics(app); // only if needed
