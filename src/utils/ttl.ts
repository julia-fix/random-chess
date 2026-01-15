const DAY_MS = 24 * 60 * 60 * 1000;

export const TTL_DAYS = 30;

export const ttlExpiresAt = (days = TTL_DAYS) => new Date(Date.now() + days * DAY_MS);
