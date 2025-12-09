import React, { useMemo, useEffect, useRef } from 'react';
import { Chess } from 'chess.js';

interface PGNMovesProps {
	game?: Chess;
	moves?: string[];
	activePly?: number;
	onSelectPly?: (ply: number) => void;
}

const Moves: React.FC<PGNMovesProps> = ({ game, moves, activePly, onSelectPly }) => {
	const history = moves ?? game?.history() ?? [];
	const containerRef = useRef<HTMLDivElement>(null);
	const activeRef = useRef<HTMLSpanElement>(null);

	const entries = useMemo(() => {
		const list: { number: number; white?: string; black?: string; whiteIndex: number; blackIndex?: number }[] = [];
		for (let i = 0; i < history.length; i += 2) {
			const moveNumber = Math.floor(i / 2) + 1;
			list.push({
				number: moveNumber,
				white: history[i],
				black: history[i + 1],
				whiteIndex: i,
				blackIndex: i + 1 < history.length ? i + 1 : undefined,
			});
		}
		return list;
	}, [history]);

	const activeIndex = (activePly ?? history.length) - 1;

	useEffect(() => {
		if (activeRef.current && containerRef.current) {
			const parent = containerRef.current;
			const el = activeRef.current;
			const elLeft = el.offsetLeft;
			const elRight = elLeft + el.offsetWidth;
			const viewLeft = parent.scrollLeft;
			const viewRight = viewLeft + parent.clientWidth;
			if (elLeft < viewLeft) {
				parent.scrollTo({ left: elLeft - 10, behavior: 'smooth' });
			} else if (elRight > viewRight) {
				parent.scrollTo({ left: elRight - parent.clientWidth + 10, behavior: 'smooth' });
			}
		}
	}, [activeIndex]);

	return (
		<div className='moves-list' data-active-index={activeIndex} ref={containerRef}>
			{entries.map((m) => (
				<span key={m.number} className='move-pair'>
					<span
						className={`move-item ${activeIndex === m.whiteIndex ? 'active' : ''}`}
						onClick={() => onSelectPly && onSelectPly(m.whiteIndex + 1)}
						ref={activeIndex === m.whiteIndex ? activeRef : undefined}
					>
						{m.number}. {m.white}
					</span>
					{m.black && (
						<span
							className={`move-item ${activeIndex === m.blackIndex ? 'active' : ''}`}
							onClick={() => onSelectPly && onSelectPly((m.blackIndex ?? 0) + 1)}
							ref={activeIndex === m.blackIndex ? activeRef : undefined}
						>
							{m.black}
						</span>
					)}
				</span>
			))}
		</div>
	);
};

export default Moves;
