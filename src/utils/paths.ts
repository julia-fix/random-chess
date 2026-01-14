export const BASE_URL = import.meta.env.BASE_URL || '/';

export function withBase(path: string) {
	const base = BASE_URL.endsWith('/') ? BASE_URL : `${BASE_URL}/`;
	const trimmed = path.startsWith('/') ? path.slice(1) : path;
	return `${base}${trimmed}`;
}

export function stripBase(pathname: string) {
	const base = BASE_URL.endsWith('/') ? BASE_URL.slice(0, -1) : BASE_URL;
	if (base && base !== '/' && pathname.startsWith(base)) {
		const stripped = pathname.slice(base.length);
		return stripped.startsWith('/') ? stripped : `/${stripped}`;
	}
	return pathname;
}
