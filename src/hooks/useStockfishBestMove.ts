import { useCallback, useEffect, useRef } from 'react';
// Use a concrete Stockfish worker build; import as URL so Vite serves it correctly.
// eslint-disable-next-line import/no-relative-packages
import stockfishWorkerUrl from 'stockfish/src/stockfish-17.1-lite-single-03e3232.js?url';

export type BestMoveRequest = {
	fen: string;
	searchMoves: string[];
	depth?: number;
	skill?: number;
};

export const MOVE_TIME_MS = 30000;
export const WORKER_HARD_TIMEOUT_MS = 35000;

export function useStockfishBestMove() {
	const requestIdRef = useRef(0);
	const activeWorkerRef = useRef<Worker | null>(null);
	const activeResolveRef = useRef<((value: string | null) => void) | null>(null);
	const activeSettledRef = useRef(false);

	useEffect(() => {
		return () => {
			activeWorkerRef.current?.terminate();
			activeWorkerRef.current = null;
			activeResolveRef.current?.(null);
			activeResolveRef.current = null;
		};
	}, []);

	const abortActive = useCallback((reason?: string) => {
		const hasActive = activeWorkerRef.current || activeResolveRef.current;
		if (!hasActive) return;
		if (reason) {
			console.warn(`[stockfish] aborting active worker${reason ? `: ${reason}` : ''}`);
		}
		try {
			activeWorkerRef.current?.terminate();
		} catch {
			// ignore
		}
		activeWorkerRef.current = null;
		if (activeResolveRef.current) {
			activeResolveRef.current(null);
			activeResolveRef.current = null;
		}
		activeSettledRef.current = false;
	}, []);

	const getBestMove = useCallback(async ({ fen, searchMoves, depth = 8, skill }: BestMoveRequest) => {
		if (!searchMoves.length) return null;

		// Only keep a single worker alive to avoid runaway CPU usage.
		if (activeWorkerRef.current) {
			activeWorkerRef.current.terminate();
			activeWorkerRef.current = null;
		}

		const depthToUse = Math.max(2, Math.min(depth, 14));
		const requestId = ++requestIdRef.current;

		return new Promise<string | null>((resolve) => {
			let engine: Worker;
			try {
				engine = new Worker(stockfishWorkerUrl);
			} catch (err) {
				console.error(`[stockfish][${requestId}] failed to create worker`, err);
				resolve(null);
				return;
			}
			activeWorkerRef.current = engine;
			activeResolveRef.current = resolve;
			activeSettledRef.current = false;
			let settled = false;
			let hardTimeout: ReturnType<typeof setTimeout>;
			let stopTimeout: ReturnType<typeof setTimeout>;

			const cleanUp = (best: string | null, reason?: string) => {
				if (settled) return;
				settled = true;
				activeSettledRef.current = true;
				clearTimeout(hardTimeout);
				clearTimeout(stopTimeout);
				try {
					engine.postMessage('quit');
				} catch {
					// ignore
				}
				engine.terminate();
				if (activeWorkerRef.current === engine) activeWorkerRef.current = null;
				activeResolveRef.current = null;

				resolve(best);
			};

			hardTimeout = setTimeout(() => cleanUp(null, 'hard-timeout'), WORKER_HARD_TIMEOUT_MS);
			stopTimeout = setTimeout(() => {
				try {
					engine.postMessage('stop');
					console.warn(`[stockfish][${requestId}] stop requested after movetime elapsed`);
				} catch {
					// ignore
				}
			}, MOVE_TIME_MS + 250);

			engine.onerror = () => {
				clearTimeout(hardTimeout);
				clearTimeout(stopTimeout);
				console.error(`[stockfish][${requestId}] worker error`);
				cleanUp(null, 'worker-error');
			};

			engine.onmessage = (event: MessageEvent) => {
				const text = typeof event.data === 'string' ? event.data : '';
				if (!text) return;

				if (text.includes('readyok')) {
					engine.postMessage('setoption name Ponder value false');
					engine.postMessage('setoption name Threads value 1');
					if (skill !== undefined) {
						engine.postMessage(`setoption name Skill Level value ${skill}`);
					}
					engine.postMessage('ucinewgame');
					engine.postMessage(`position fen ${fen}`);
					engine.postMessage(`go depth ${depthToUse} movetime ${MOVE_TIME_MS} searchmoves ${searchMoves.join(' ')}`);
				}

				if (text.startsWith('bestmove')) {
					clearTimeout(hardTimeout);
					clearTimeout(stopTimeout);
					const parts = text.split(' ');
					const best = parts[1];
					if (best === '(none)' || best === '0000' || !best) {
						cleanUp(null, 'no-move');
						return;
					}
					cleanUp(best, 'bestmove');
					return;
				}
			};

			engine.postMessage('uci');
			engine.postMessage('isready');

			// If the engine never acknowledges ready, still try a shallow search to avoid hanging.
			setTimeout(() => {
				if (!settled && !activeSettledRef.current) {
					console.warn(`[stockfish][${requestId}] no readyok yet, sending shallow search fallback`);
					engine.postMessage(`position fen ${fen}`);
					engine.postMessage(`go depth ${Math.min(4, depthToUse)} movetime ${MOVE_TIME_MS} searchmoves ${searchMoves.join(' ')}`);
				}
			}, 200);
		});
	}, []);

	return { getBestMove, abortActive };
}
