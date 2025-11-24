import { useState, useContext } from 'react';
import { UserContext } from "../contexts/UserContext";
import { FormattedMessage, useIntl } from "react-intl";
import { auth } from "../utils/firebase";
import {
	GoogleAuthProvider,
	EmailAuthProvider,
	PhoneAuthProvider,
	RecaptchaVerifier,
	signInWithPopup,
	signInWithPhoneNumber
} from "firebase/auth";

import PageLoading from "../components/PageLoading";
import UserName from "../components/UserName";

export default function Auth() {
	const user = useContext(UserContext);
	const intl = useIntl();
	const [phone, setPhone] = useState("");
	const [smsCode, setSmsCode] = useState("");
	const [confirmationResult, setConfirmationResult] = useState<any>(null);

	const googleLogin = async () => {
		const provider = new GoogleAuthProvider();
		await signInWithPopup(auth, provider);
	};

	const emailLogin = async () => {
		const provider = new EmailAuthProvider();
		await signInWithPopup(auth, provider);
	};

	const phoneLogin = async () => {
		if (!window.recaptchaVerifier) {
			window.recaptchaVerifier = new RecaptchaVerifier(auth, "recaptcha", {
				size: "invisible",
			});
		}
		const result = await signInWithPhoneNumber(auth, phone, window.recaptchaVerifier);
		setConfirmationResult(result);
	};

	const confirmSms = async () => {
		if (!confirmationResult) return;
		await confirmationResult.confirm(smsCode);
	};

	if (user.loading) return <PageLoading />;

	if (user.loggedIn)
		return (
			<p>
				<FormattedMessage id="hello" /> <UserName user={user} />
			</p>
		);

	return (
		<div className="auth-page">

			<button onClick={googleLogin}>Login with Google</button>

			<button onClick={emailLogin}>Login with Email</button>

			{/* Phone auth */}
			<div>
				<input
					placeholder="+12025550123"
					value={phone}
					onChange={(e) => setPhone(e.target.value)}
				/>
				<button onClick={phoneLogin}>Send SMS</button>
			</div>

			{confirmationResult && (
				<div>
					<input
						placeholder="SMS Code"
						value={smsCode}
						onChange={(e) => setSmsCode(e.target.value)}
					/>
					<button onClick={confirmSms}>Confirm</button>
				</div>
			)}

			<div id="recaptcha"></div>
		</div>
	);
}
