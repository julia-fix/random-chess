import { useCallback, useEffect, useState, RefObject } from 'react';

/**
 * Calculates and tracks board width based on a container ref.
 */
export default function useBoardSize(containerRef: RefObject<HTMLDivElement | null>, maxWidth = 500, fallback = 400) {
	const [boardWidth, setBoardWidth] = useState(fallback);

	const calcBoardWidth = useCallback(() => {
		if (containerRef.current) {
			let width = containerRef.current.clientWidth;
			if (width > maxWidth) width = maxWidth;
			setBoardWidth(width);
		} else {
			setBoardWidth(fallback);
		}
	}, [containerRef, fallback, maxWidth]);

	useEffect(() => {
		calcBoardWidth();
		window.addEventListener('resize', calcBoardWidth);
		return () => {
			window.removeEventListener('resize', calcBoardWidth);
		};
	}, [calcBoardWidth]);

	return boardWidth;
}
