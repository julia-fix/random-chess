
const paths = window.location.pathname.split('/');
const language = window.navigator.language;

let calcLang = 'en';
if (paths.indexOf('en') > -1) {
	calcLang = 'en';
}
else if (paths.indexOf('ru') > -1) {
	calcLang = 'ru';
}
else if (language && language.indexOf('ru') === 0) {
	calcLang = 'ru';
}

export const currentLang = calcLang;