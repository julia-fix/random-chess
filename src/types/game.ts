import { DocumentReference } from 'firebase/firestore';

export type PlayerId = string | null | undefined;

export type GameDoc = {
	white?: PlayerId;
	black?: PlayerId;
	participants?: string[];
	whiteName?: string | null;
	blackName?: string | null;
	createdAt?: any;
};

export type GameDataDoc = {
	status?: 'waiting' | 'playing' | 'finished';
	whiteArrived?: boolean;
	blackArrived?: boolean;
	firstCard?: string | number;
	gameId?: string;
	timeLimitMs?: number;
	whiteTimeLeftMs?: number;
	blackTimeLeftMs?: number;
	lastMoveAt?: any;
	winner?: 'w' | 'b' | null;
	resultReason?: 'timeout' | 'resign' | 'agreement' | 'stalemate' | 'checkmate' | 'insufficient' | 'other';
	drawOffer?: { by: 'w' | 'b' };
};

export type GameMovesDoc = {
	moves?: any[];
	fen?: string;
	pgn?: string;
	gameId?: string;
};

export type ChatAuthor = {
	uid: string | null;
	displayName: string | null;
	photoURL: string | null;
	isAnonymous: boolean;
};

export type ChatMessage = {
	createdAt: any;
	text: string;
	msgId: string;
	author: ChatAuthor;
};

export type ChatDoc = {
	gameId?: string;
	messages?: ChatMessage[];
	unread?: Record<string, number>;
	createdAt?: any;
};

export type GameRefs = {
	gameRef?: DocumentReference;
	gameDataRef?: DocumentReference;
	movesRef?: DocumentReference;
};
