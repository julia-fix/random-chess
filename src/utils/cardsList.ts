export const numbers: Array<number> = [1, 2, 3, 4, 5, 6, 7, 8];
export const letters: Array<string> = ['a', 'b', 'c', 'd', 'e', 'f', 'g', 'h'];
export const pieces: Array<string> = ['R', 'N', 'B', 'K', 'Q'];
export const pawns: Array<string> = new Array(4).fill('p');
export const moves: Array<string> = ['check', 'stalemate', 'take', 'any'];

export const cards: Array<string | number> = [...numbers, ...numbers, ...letters, ...letters, ...pieces, ...pieces, ...pawns, ...moves];
