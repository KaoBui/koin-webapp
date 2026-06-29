// Shared input-length caps. The DB columns are unbounded text, so these guard
// against accidental/garbage oversized input rather than a storage limit.

export const MAX_NAME_LENGTH = 60;
export const MAX_DESCRIPTION_LENGTH = 200;
