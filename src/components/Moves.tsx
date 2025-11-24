import React, { useMemo } from "react";
import { Chess } from "chess.js";

interface PGNMovesProps {
	game: Chess;
}

const Moves: React.FC<PGNMovesProps> = ({ game }) => {
	// useMemo ensures we only recompute moves when game changes
	const movesWithNumbers = useMemo(() => {
		const history = game.history();
		let result = "";
		for (let i = 0; i < history.length; i += 2) {
			const moveNumber = Math.floor(i / 2) + 1;
			const whiteMove = history[i];
			const blackMove = history[i + 1] || "";
			result += `${moveNumber}. ${whiteMove} ${blackMove} `;
		}
		return result.trim();
	}, [game]); // recompute when game instance updates

	return (
		<>{movesWithNumbers}</>
	);
};

export default Moves;
