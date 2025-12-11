import { DocumentReference } from 'firebase/firestore';

/**
 * Wrap Firestore writes to log the doc path and payload on errors.
 */
export async function logWrite<T>(label: string, ref: DocumentReference | undefined, payload: any, fn: () => Promise<T>): Promise<T> {
	try {
		return await fn();
	} catch (e) {
		const path = ref ? (ref as any).path || (ref as any)._path?.canonicalString || ref.toString?.() : 'unknown-ref';
		console.error(`[FS WRITE ERROR] ${label} -> ${path}`, payload, e);
		throw e;
	}
}
