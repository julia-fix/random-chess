import { Route, Routes, BrowserRouter as Router } from 'react-router-dom';

import { IntlProvider } from 'react-intl';
import Russian from '../lang/ru.json';
import English from '../lang/en.json';

import { currentLang } from '../utils/settings';
import SingleGame from '../pages/SingleGame';

type OneLang = { [key: string]: string };

type LangList = {
	[key: string]: OneLang;
};

const langs: LangList = {
	ru: Russian,
	en: English,
};

export default function ChessRoutes() {
	return (
		<IntlProvider locale={currentLang} messages={langs[currentLang]}>
			<Router>
				<Routes>
					<Route path='/chess/' element={<SingleGame />}>
						<Route index element={<SingleGame />} />
						<Route path=':lang' element={<SingleGame />} />
					</Route>
				</Routes>
			</Router>
		</IntlProvider>
	);
}
