import ChessRoutes from './router';
import { IntlProvider } from 'react-intl';
import { getLangFromPathname, getStoredLang } from './utils/settings';
import { useLocation } from 'react-router-dom';
import { useMemo } from 'react';

import Russian from './lang/ru.json';
import English from './lang/en.json';
import UserProvider from './contexts/UserContext';

type OneLang = { [key: string]: string };

type LangList = {
	[key: string]: OneLang;
};

const langs: LangList = {
	ru: Russian,
	en: English,
};

function App() {
	const location = useLocation();
	const currentLang = useMemo(
		() => getLangFromPathname(location.pathname, window.navigator.language, getStoredLang()),
		[location.pathname]
	);
	return (
		<IntlProvider locale={currentLang} messages={langs[currentLang]}>
			<UserProvider>
				<ChessRoutes />
			</UserProvider>
		</IntlProvider>
	);
}

export default App;
