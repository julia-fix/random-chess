import { useState, useContext, useEffect, useMemo } from 'react';
import { UserContext } from '../contexts/UserContext';
import { FormattedMessage } from 'react-intl';
import { auth } from '../utils/firebase';
import {
	GoogleAuthProvider,
	signInAnonymously,
	signInWithPopup,
	fetchSignInMethodsForEmail,
	signInWithEmailAndPassword,
	createUserWithEmailAndPassword,
	updateProfile,
} from 'firebase/auth';
import '@firebase-oss/ui-styles/dist.min.css';
import { useLocation, useNavigate } from 'react-router-dom';

import PageLoading from '../components/PageLoading';
import UserName from '../components/UserName';

export default function Auth() {
	const user = useContext(UserContext);
	const [mode, setMode] = useState<'idle' | 'email' | 'phone'>('idle');
	const [email, setEmail] = useState('');
	const [password, setPassword] = useState('');
	const [displayName, setDisplayName] = useState('');
	const [emailExists, setEmailExists] = useState<boolean | null>(null);
	const [error, setError] = useState<string | null>(null);
	const [loading, setLoading] = useState(false);
	const location = useLocation();
	const navigate = useNavigate();

	const redirectUrl = useMemo(() => {
		const params = new URLSearchParams(location.search);
		const raw = params.get('redirectUrl');
		if (!raw) return null;
		try {
			return decodeURIComponent(raw);
		} catch {
			return raw;
		}
	}, [location.search]);

	const resetEmailFlow = () => {
		setEmailExists(null);
		setPassword('');
		setDisplayName('');
	};

	const handleGuest = async () => {
		setError(null);
		setLoading(true);
		try {
			await signInAnonymously(auth);
		} catch (e: any) {
			setError(e?.message || 'Guest sign-in failed');
		} finally {
			setLoading(false);
		}
	};

	const handleGoogle = async () => {
		setError(null);
		setLoading(true);
		try {
			const provider = new GoogleAuthProvider();
			await signInWithPopup(auth, provider);
		} catch (e: any) {
			setError(e?.message || 'Google sign-in failed');
		} finally {
			setLoading(false);
		}
	};

	const checkEmail = async () => {
		setError(null);
		setLoading(true);
		try {
			const methods = await fetchSignInMethodsForEmail(auth, email);
			setEmailExists(methods.includes('password'));
		} catch (e: any) {
			setError(e?.message || 'Email check failed');
			setEmailExists(null);
		} finally {
			setLoading(false);
		}
	};

	const loginEmail = async () => {
		setError(null);
		setLoading(true);
		try {
			await signInWithEmailAndPassword(auth, email, password);
		} catch (e: any) {
			setError(e?.message || 'Email sign-in failed');
		} finally {
			setLoading(false);
		}
	};

	const signupEmail = async () => {
		setError(null);
		setLoading(true);
		try {
			const cred = await createUserWithEmailAndPassword(auth, email, password);
			if (displayName) {
				await updateProfile(cred.user, { displayName });
				// Ensure local auth user picks up the new name immediately
				await cred.user.reload();
			}
		} catch (e: any) {
			setError(e?.message || 'Email sign-up failed');
		} finally {
			setLoading(false);
		}
	};

	useEffect(() => {
		if (user.loggedIn && redirectUrl) {
			navigate(redirectUrl, { replace: true });
		}
	}, [user.loggedIn, redirectUrl, navigate]);

	if (user.loading) return <PageLoading />;

	if (user.loggedIn && redirectUrl) {
		return <PageLoading />;
	}

	if (user.loggedIn)
		return (
			<p>
				<FormattedMessage id='hello' /> <UserName user={user} />
			</p>
		);

	return (
		<div className='auth-page d-flex justify-content-center'>
			<div className='auth-card' style={{ maxWidth: 420, width: '100%', marginTop: 40 }}>
				<div className='card shadow-sm'>
					<div className='card-header'>
						<h2 className='text-center mb-0'>
							<FormattedMessage id='login' defaultMessage='Login' />
						</h2>
					</div>
					<div className='card-body d-grid gap-3'>
						{error && (
							<div className='alert alert-danger mb-0' role='alert'>
								{error}
							</div>
						)}

						<button className='btn btn-primary btn-lg text-white' onClick={handleGoogle} disabled={loading}>
							<FormattedMessage id='auth.google' defaultMessage='Sign in with Google' />
						</button>

						<button
							className='btn btn-danger btn-lg'
							onClick={() => {
								const next = mode === 'email' ? 'idle' : 'email';
								setMode(next);
								resetEmailFlow();
							}}
						>
							<FormattedMessage id='auth.email.button' defaultMessage='Sign in with email' />
						</button>

						{mode === 'email' && (
							<div className='d-grid gap-2'>
								<input
									type='email'
									className='form-control form-control-lg'
									placeholder='email@example.com'
									value={email}
									onChange={(e) => setEmail(e.target.value)}
								/>
								<button className='btn btn-primary' onClick={checkEmail} disabled={!email || loading}>
									<FormattedMessage id='auth.email.check' defaultMessage='Continue' />
								</button>
								{emailExists === true && (
									<>
										<input
											type='password'
											className='form-control form-control-lg'
											placeholder='Password'
											value={password}
											onChange={(e) => setPassword(e.target.value)}
										/>
										<button className='btn btn-danger' onClick={loginEmail} disabled={!password || loading}>
											<FormattedMessage id='auth.email.signin' defaultMessage='Sign in' />
										</button>
									</>
								)}
								{emailExists === false && (
									<>
										<input
											type='text'
											className='form-control form-control-lg'
											placeholder='Name'
											value={displayName}
											onChange={(e) => setDisplayName(e.target.value)}
										/>
										<input
											type='password'
											className='form-control form-control-lg'
											placeholder='Password'
											value={password}
											onChange={(e) => setPassword(e.target.value)}
										/>
										<button className='btn btn-danger' onClick={signupEmail} disabled={!password || loading}>
											<FormattedMessage id='auth.email.signup' defaultMessage='Create account' />
										</button>
									</>
								)}
							</div>
						)}

						<button className='btn btn-warning btn-lg' onClick={handleGuest} disabled={loading}>
							<FormattedMessage id='auth.guest' defaultMessage='Continue as guest' />
						</button>
						<div className='d-none' id='recaptcha' />
					</div>
				</div>
			</div>
		</div>
	);
}
