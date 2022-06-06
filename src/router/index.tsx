import { Route, Routes } from 'react-router-dom';
import { Outlet } from 'react-router';

import SingleGame from '../pages/SingleGame';
import NotFound from '../pages/NotFound';
import PlayGame from '../pages/PlayGame';
import PlayGameIndex from '../pages/PlayGameIndex';
import GameChoice from '../pages/GameChoice';
import { Toaster } from 'react-hot-toast';
import { HelmetProvider, Helmet } from 'react-helmet-async';
import { useIntl } from 'react-intl';

const LangRoutes = () => (
	<>
		<Routes>
			<Route index element={<GameChoice />} />
			<Route path='single' element={<SingleGame />} />
			<Route path='play/*'>
				<Route index element={<PlayGameIndex />} />
				<Route path=':gameId' element={<PlayGame />} />
				<Route path='*' element={<NotFound />} />
			</Route>
			<Route path='*' element={<NotFound />} />
		</Routes>
		<Outlet />
	</>
);

const langsRoutes = ['ru', 'en'];

export default function ChessRoutes() {
	const intl = useIntl();
	return (
		<>
			<HelmetProvider>
				<Helmet>
					<title>{intl.formatMessage({ id: 'chess' })}</title>
					<meta name='description' content={intl.formatMessage({ id: 'chess' })} />
				</Helmet>
			</HelmetProvider>
			<div className='container'>
				<Routes>
					{langsRoutes.map((lang: string) => (
						<Route key={lang} path={`/chess/${lang}/*`} element={<LangRoutes />} />
					))}
					<Route path='chess/*' element={<LangRoutes />} />
				</Routes>
			</div>
			<Toaster />
		</>
	);
}
