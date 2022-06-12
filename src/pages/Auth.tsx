import firebase from 'firebase/compat/app';
import 'firebase/compat/auth';
import { auth } from '../utils/firebase';
import { useRef, useLayoutEffect, useContext } from 'react';
import { UserContext } from '../contexts/UserContext';
import { FormattedMessage, useIntl } from 'react-intl';

import * as firebaseui from 'firebaseui';
import useScript from 'react-use-scripts';
import { Helmet, HelmetProvider } from 'react-helmet-async';
import UserName from '../components/UserName';
import PageLoading from '../components/PageLoading';

export default function Auth() {
	const user = useContext(UserContext);
	const intl = useIntl();
	const languageCode = intl.locale || 'ru'; // get from somewhere
	// get query params from url using react-router-dom

	const firebaseuiElement = useRef<HTMLDivElement | null>(null);
	// const recaptchaElement = useRef<HTMLElement | null>(null);

	const { ready } = useScript({
		src: `https://www.gstatic.com/firebasejs/ui/6.0.0/firebase-ui-auth__${languageCode}.js`,
	});

	useLayoutEffect(() => {
		const urlParams = new URLSearchParams(window.location.search);
		const redirectUrl = urlParams.get('redirectUrl') || '/chess/' + intl.locale;
		const firebaseUiConfig: firebaseui.auth.Config = {
			signInOptions: [
				firebase.auth.GoogleAuthProvider.PROVIDER_ID,
				firebase.auth.EmailAuthProvider.PROVIDER_ID,
				{
					provider: firebase.auth.PhoneAuthProvider.PROVIDER_ID,
					recaptchaParameters: {
						type: 'image', // 'audio'
						size: 'invisible', // 'invisible', 'normal' or 'compact'
						badge: 'bottomleft', //' bottomright' or 'inline' applies to invisible.
					},
				},
				firebaseui.auth.AnonymousAuthProvider.PROVIDER_ID,
			],
			signInFlow: 'popup',
			signInSuccessUrl: redirectUrl,
		};

		// console.log('firebase.apps', firebase.apps);
		if (ready && firebaseuiElement.current && !user.loading && !user.loggedIn) {
			(window as any).firebase = firebase;
			// const firebaseuiUMD: typeof firebaseui = (window as any).firebaseui;
			const ui = firebaseui.auth.AuthUI.getInstance() || new firebaseui.auth.AuthUI(auth);
			ui.start(firebaseuiElement.current, firebaseUiConfig);
		}
	}, [ready, user, intl.locale]);

	return (
		<>
			<HelmetProvider>
				<Helmet>
					<link type='text/css' rel='stylesheet' href='https://www.gstatic.com/firebasejs/ui/6.0.1/firebase-ui-auth.css' />
				</Helmet>
			</HelmetProvider>
			<div ref={firebaseuiElement} />
			{user.loading ? (
				<PageLoading />
			) : (
				user.loggedIn && (
					<p>
						<FormattedMessage id='hello' /> <UserName user={user} />
					</p>
				)
			)}
		</>
	);
}
