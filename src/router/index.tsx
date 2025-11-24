import { Route, Routes } from 'react-router-dom';
import { Outlet } from 'react-router';

import SingleGame from '../pages/SingleGame';
import NotFound from '../pages/NotFound';
import OnlineGame from '../pages/OnlineGame';
import GameChoice from '../pages/GameChoice';
import { Toaster } from 'react-hot-toast';
import { useIntl } from 'react-intl';
import Auth from '../pages/Auth';
import Header from '../components/Header';
import RequireAuth from '../components/RequireAuth';
import { useEffect } from 'react';

const LangRoutes = () => (
	<>
		<Routes>
			<Route index element={<GameChoice />} />
			<Route path='single' element={<SingleGame />} />
			<Route path='auth' element={<Auth />} />
			<Route element={<RequireAuth />}>
				<Route path='play/*'>
					<Route index element={<GameChoice />} />
					<Route path=':gameId' element={<OnlineGame />} />
					<Route path='*' element={<NotFound />} />
				</Route>
			</Route>
			<Route path='*' element={<NotFound />} />
		</Routes>
		<Outlet />
	</>
);

const langsRoutes = ['ru', 'en'];

export default function ChessRoutes() {
	const intl = useIntl();
	const title = intl.formatMessage({ id: 'chess' });

	// update the page title and meta description
	useEffect(() => {
		document.title = title;
		const metaDescription = document.querySelector('meta[name="description"]');
		if (metaDescription) {
			metaDescription.setAttribute('content', title);
		} else {
			const meta = document.createElement('meta');
			meta.name = 'description';
			meta.content = title;
			document.head.appendChild(meta);
		}
	}, [title]);

	return (
		<>

			<Header />

			<div className='container'>
				<Routes>
					{langsRoutes.map((lang: string) => (
						<Route
							key={lang}
							path={`/chess/${lang}/*`}
							element={<LangRoutes />}
						/>
					))}
					<Route path='chess/*' element={<LangRoutes />} />
				</Routes>
			</div>

			<Toaster />
		</>
	);
}
