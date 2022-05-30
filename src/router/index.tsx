import { Route, Routes } from 'react-router-dom';
import { Outlet } from 'react-router';

import { IntlProvider } from 'react-intl';
import Russian from '../lang/ru.json';
import English from '../lang/en.json';

import { currentLang } from '../utils/settings';
import SingleGame from '../pages/SingleGame';
import NotFound from '../pages/NotFound';
import PlayGame from '../pages/PlayGame';
import PlayGameIndex from '../pages/PlayGameIndex';
import GameChoice from '../pages/GameChoice';
import { Toaster } from 'react-hot-toast';

type OneLang = { [key: string]: string };

type LangList = {
	[key: string]: OneLang;
};

const langs: LangList = {
	ru: Russian,
	en: English,
};

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
	return (
		<IntlProvider locale={currentLang} messages={langs[currentLang]}>
			<div className='container'>
				<Routes>
					{langsRoutes.map((lang: string) => (
						<Route key={lang} path={`/chess/${lang}/*`} element={<LangRoutes />} />
					))}
					<Route path='chess/*' element={<LangRoutes />} />
				</Routes>
			</div>
			<Toaster />
		</IntlProvider>
	);
}
