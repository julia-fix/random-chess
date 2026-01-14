import { useState, useContext, useEffect, useMemo, useCallback } from 'react';
import { UserContext } from '../contexts/UserContext';
import { FormattedMessage, useIntl } from 'react-intl';
import { auth } from '../utils/firebase';
import usePageMeta from '../hooks/usePageMeta';
import {
	GoogleAuthProvider,
	signInAnonymously,
	signInWithPopup,
	fetchSignInMethodsForEmail,
	signInWithEmailAndPassword,
	createUserWithEmailAndPassword,
	updateProfile,
	sendPasswordResetEmail,
	sendEmailVerification,
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
	const [lastCheckedEmail, setLastCheckedEmail] = useState<string | null>(null);
	const [resetInfo, setResetInfo] = useState<string | null>(null);
	const [verifyInfo, setVerifyInfo] = useState<string | null>(null);
	const [failCount, setFailCount] = useState(0);
	const [cooldownUntil, setCooldownUntil] = useState<number | null>(null);
	const location = useLocation();
	const navigate = useNavigate();
	const intl = useIntl();
	usePageMeta({
		titleId: 'meta.title.auth',
		titleDefault: 'Login | Random Chess',
		descriptionId: 'meta.desc.auth',
		descriptionDefault: 'Sign in or continue as a guest to create online games, save history, and chat with opponents.',
	});

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

	const redirectAfterLogin = useCallback(() => {
		if (redirectUrl) {
			navigate(redirectUrl, { replace: true });
		} else {
			navigate(`/${intl.locale}/`, { replace: true });
		}
	}, [redirectUrl, navigate, intl.locale]);

	const resetEmailFlow = () => {
		setEmailExists(null);
		setPassword('');
		setDisplayName('');
	};

	const handleGuest = async () => {
		setError(null);
		setVerifyInfo(null);
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
		setVerifyInfo(null);
		setLoading(true);
		try {
			const provider = new GoogleAuthProvider();
			await signInWithPopup(auth, provider);
			redirectAfterLogin();
		} catch (e: any) {
			setError(e?.message || 'Google sign-in failed');
		} finally {
			setLoading(false);
		}
	};

	const checkEmail = async () => {
		setError(null);
		setResetInfo(null);
		setVerifyInfo(null);
		if (cooldownUntil && Date.now() < cooldownUntil) {
			return;
		}
		setLoading(true);
		try {
			const methods = await fetchSignInMethodsForEmail(auth, email);
			setEmailExists(methods.includes('password'));
			setLastCheckedEmail(email);
		} catch (e: any) {
			setError(e?.message || 'Email check failed');
			setEmailExists(null);
		} finally {
			setLoading(false);
		}
	};

	const loginEmail = async () => {
		setError(null);
		setVerifyInfo(null);
		if (cooldownUntil && Date.now() < cooldownUntil) {
			return;
		}
		setLoading(true);
		try {
			const cred = await signInWithEmailAndPassword(auth, email, password);
			if (!cred.user.emailVerified) {
				await sendEmailVerification(cred.user);
				setVerifyInfo('auth.verify_email.prompt');
				await auth.signOut();
			}
			setFailCount(0);
			setCooldownUntil(null);
		} catch (e: any) {
			setError(e?.message || 'Email sign-in failed');
			const nextFail = failCount + 1;
			setFailCount(nextFail);
			if (nextFail >= 3) {
				const waitMs = 30_000;
				setCooldownUntil(Date.now() + waitMs);
			}
		} finally {
			setLoading(false);
		}
	};

	const signupEmail = async () => {
		setError(null);
		setVerifyInfo(null);
		if (cooldownUntil && Date.now() < cooldownUntil) {
			return;
		}
		setLoading(true);
		try {
			const cred = await createUserWithEmailAndPassword(auth, email, password);
			if (displayName) {
				await updateProfile(cred.user, { displayName });
				// Ensure local auth user picks up the new name immediately
				await cred.user.reload();
			}
			await sendEmailVerification(cred.user);
			setVerifyInfo('auth.verify_email.sent');
			await auth.signOut();
			setFailCount(0);
			setCooldownUntil(null);
		} catch (e: any) {
			setError(e?.message || 'Email sign-up failed');
			const nextFail = failCount + 1;
			setFailCount(nextFail);
			if (nextFail >= 3) {
				const waitMs = 30_000;
				setCooldownUntil(Date.now() + waitMs);
			}
		} finally {
			setLoading(false);
		}
	};

	const handleResetPassword = async () => {
		setError(null);
		setResetInfo(null);
		setVerifyInfo(null);
		if (cooldownUntil && Date.now() < cooldownUntil) {
			return;
		}
		setLoading(true);
		try {
			await sendPasswordResetEmail(auth, email);
			setResetInfo('auth.reset_password.sent');
			setFailCount(0);
			setCooldownUntil(null);
		} catch (e: any) {
			setError(e?.message || 'Reset failed');
			const nextFail = failCount + 1;
			setFailCount(nextFail);
			if (nextFail >= 3) {
				const waitMs = 30_000;
				setCooldownUntil(Date.now() + waitMs);
			}
		} finally {
			setLoading(false);
		}
	};

	useEffect(() => {
		if (user.loggedIn && (user.emailVerified ?? true)) {
			redirectAfterLogin();
		}
	}, [user.loggedIn, user.emailVerified, redirectAfterLogin]);

if (user.loading) return <PageLoading />;

if (user.loggedIn && (user.emailVerified ?? true)) return <PageLoading />;

	const handleVerifiedContinue = () => {
		setVerifyInfo(null);
		setError(null);
		setResetInfo(null);
		setMode('email');
		if (email) {
			setEmailExists(true);
			setLastCheckedEmail(email);
		} else {
			setEmailExists(null);
		}
		setFailCount(0);
		setCooldownUntil(null);
	};

	const handleOtherSignIn = () => {
		setVerifyInfo(null);
		setError(null);
		setResetInfo(null);
		setMode('idle');
		setEmailExists(null);
		setLastCheckedEmail(null);
		setPassword('');
		setFailCount(0);
		setCooldownUntil(null);
	};

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
						{resetInfo && (
							<div className='alert alert-success mb-0' role='alert'>
								<FormattedMessage id={resetInfo} defaultMessage='Reset email sent. Please check your inbox.' />
							</div>
						)}
						{verifyInfo && (
							<div className='alert alert-success mb-0' role='alert'>
								<FormattedMessage
									id={verifyInfo}
									defaultMessage='Verification email sent. Please check your inbox, click the link, then return and sign in.'
								/>
							</div>
						)}
						{cooldownUntil && Date.now() < cooldownUntil && (
							<div className='alert alert-warning mb-0' role='alert' data-testid='cooldown-message'>
								<FormattedMessage
									id='auth.cooldown'
									defaultMessage='Too many attempts. Please wait a moment and try again.'
								/>
							</div>
						)}

						{verifyInfo ? (
							<div className='d-grid gap-2'>
								<button className='btn btn-primary btn-lg text-white' onClick={handleVerifiedContinue} disabled={loading}>
									<FormattedMessage id='auth.verify_email.continue' defaultMessage='I confirmed email' />
								</button>
								<button className='btn btn-outline-secondary btn-lg' onClick={handleOtherSignIn} disabled={loading}>
									<FormattedMessage id='auth.verify_email.other' defaultMessage='Use another sign-in option' />
								</button>
							</div>
						) : (
							<>
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
											onChange={(e) => {
												const next = e.target.value;
												setEmail(next);
												if (next !== lastCheckedEmail) {
													setEmailExists(null);
													setLastCheckedEmail(null);
													setPassword('');
													setDisplayName('');
												}
											}}
										/>
										{email !== lastCheckedEmail && (
											<button className='btn btn-primary' onClick={checkEmail} disabled={!email || loading}>
												<FormattedMessage id='auth.email.check' defaultMessage='Continue' />
											</button>
										)}
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
												<button className='btn btn-link p-0 text-start' onClick={handleResetPassword} disabled={!email || loading}>
													<FormattedMessage id='auth.reset_password' defaultMessage='Forgot password?' />
												</button>
											</>
										)}
										{emailExists === false && (
											<>
												<input
													type='text'
													className='form-control form-control-lg'
													placeholder='Username'
													required
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
												<button className='btn btn-danger' onClick={signupEmail} disabled={!password || !displayName || loading}>
													<FormattedMessage id='auth.email.signup' defaultMessage='Create account' />
												</button>
											</>
										)}
									</div>
								)}

								<button className='btn btn-warning btn-lg' onClick={handleGuest} disabled={loading}>
									<FormattedMessage id='auth.guest' defaultMessage='Continue as guest' />
								</button>
							</>
						)}
					</div>
				</div>
			</div>
		</div>
	);
}
