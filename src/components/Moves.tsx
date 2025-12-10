import React, { useMemo, useEffect, useRef } from 'react';
import { Chess } from 'chess.js';

interface MoveEntry {
	san?: string;
	from?: string;
	to?: string;
	promotion?: string;
	card?: string | number;
	[index: string]: any;
}

interface PGNMovesProps {
	game?: Chess;
	moves?: Array<string | MoveEntry>;
	activePly?: number;
	onSelectPly?: (ply: number) => void;
}

const Moves: React.FC<PGNMovesProps> = ({ game, moves, activePly, onSelectPly }) => {
	const history = moves ?? game?.history() ?? [];
	const containerRef = useRef<HTMLDivElement>(null);
	const activeRef = useRef<HTMLSpanElement>(null);

	const entries = useMemo(() => {
		const list: { number: number; white?: MoveEntry | string; black?: MoveEntry | string; whiteIndex: number; blackIndex?: number }[] = [];
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

	const moveCard = (m?: MoveEntry | string) => {
		if (!m || typeof m === 'string') return undefined;
		return m.card;
	};

	const renderMoveText = (m?: MoveEntry | string) => {
		if (!m) return '';
		if (typeof m === 'string') return m;
		return m.san || `${m.from ?? ''}${m.to ?? ''}`;
	};

	// Scroll only when externally asked (e.g., navigation buttons)
	useEffect(() => {
		if (!activeRef.current || !containerRef.current) return;
		if (containerRef.current.dataset.scrollOnActive !== 'true') return;
		activeRef.current.scrollIntoView({
			behavior: 'smooth',
			block: 'nearest',
			inline: 'nearest',
		});
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
						{m.number}. {moveCard(m.white) !== undefined && (
							<span className='move-card'>{moveCard(m.white)}</span>
						)}
						{renderMoveText(m.white)}
					</span>
					{m.black && (
						<span
							className={`move-item ${activeIndex === m.blackIndex ? 'active' : ''}`}
							onClick={() => onSelectPly && onSelectPly((m.blackIndex ?? 0) + 1)}
							ref={activeIndex === m.blackIndex ? activeRef : undefined}
						>
							{moveCard(m.black) !== undefined && <span className='move-card'>{moveCard(m.black)}</span>}
							{renderMoveText(m.black)}
						</span>
					)}
				</span>
			))}
		</div>
	);
};

export default Moves;
