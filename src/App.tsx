import ChessRoutes from './router';
import { IntlProvider } from 'react-intl';
import { currentLang } from './utils/settings';

import Russian from './lang/ru.json';
import English from './lang/en.json';

type OneLang = { [key: string]: string };

type LangList = {
	[key: string]: OneLang;
};

const langs: LangList = {
	ru: Russian,
	en: English,
};

function App() {
	return (
		<IntlProvider locale={currentLang} messages={langs[currentLang]}>
			<ChessRoutes />
		</IntlProvider>
	);
}

export default App;
