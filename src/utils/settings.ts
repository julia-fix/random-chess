
const SUPPORTED_LANGS = ['en', 'ru'] as const;
type SupportedLang = (typeof SUPPORTED_LANGS)[number];

const STORAGE_KEY = 'random_chess_lang';

export function getStoredLang(): SupportedLang | null {
	try {
		const raw = window.localStorage.getItem(STORAGE_KEY);
		if (raw === 'en' || raw === 'ru') return raw;
	} catch {
		// ignore storage failures
	}
	return null;
}

export function setStoredLang(lang: SupportedLang) {
	try {
		window.localStorage.setItem(STORAGE_KEY, lang);
	} catch {
		// ignore storage failures
	}
}

import { stripBase } from './paths';

export function getLangFromPathname(
	pathname: string,
	browserLanguage?: string,
	storedLang?: SupportedLang | null
): SupportedLang {
	const cleanedPathname = stripBase(pathname);
	const match = cleanedPathname.match(/^\/(en|ru)(?=\/|$)/);
	if (match) {
		return match[1] as SupportedLang;
	}
	if (storedLang) {
		return storedLang;
	}
	if (browserLanguage && browserLanguage.indexOf('ru') === 0) {
		return 'ru';
	}
	return 'en';
}

export const currentLang: SupportedLang = getLangFromPathname(
	window.location.pathname,
	window.navigator.language,
	getStoredLang()
);
