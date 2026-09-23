export const formatIST = (dateInput?: string | number | Date | null, options?: Intl.DateTimeFormatOptions): string => {
  if (dateInput === null || dateInput === undefined || dateInput === '') return '-';
  const date = new Date(dateInput);
  if (isNaN(date.getTime())) return '-';
  try {
    return date.toLocaleString('en-IN', {
      timeZone: 'Asia/Kolkata',
      month: 'short',
      day: 'numeric',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
      hour12: true,
      ...options,
    });
  } catch (e) {
    return '-';
  }
};

export const formatISTExact = (dateInput?: string | number | Date | null): string => {
  if (dateInput === null || dateInput === undefined || dateInput === '') return '-';
  const date = new Date(dateInput);
  if (isNaN(date.getTime())) return '-';
  try {
    const formatted = date.toLocaleString('en-IN', {
      timeZone: 'Asia/Kolkata',
      day: 'numeric',
      month: 'short',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
      second: '2-digit',
      hour12: true
    });
    return `${formatted} IST`;
  } catch (e) {
    return '-';
  }
};

/**
 * Safely extracts normalized epoch milliseconds from a trade or transaction record.
 * Prioritizes the actual trade opening timestamp (openedAt), falling back to createdAt or timestamp.
 * Returns 0 if missing or invalid, avoiding transient current-time overrides.
 */
export const getTradeSortTimestamp = (
  item?: { openedAt?: string | number | Date | null; createdAt?: string | number | Date | null; timestamp?: string | number | Date | null } | null
): number => {
  if (!item) return 0;
  const raw = item.openedAt ?? item.createdAt ?? item.timestamp;
  if (!raw) return 0;
  const time = new Date(raw).getTime();
  return isNaN(time) ? 0 : time;
};

/**
 * Sorts trade/transaction records in deterministic chronological order (default: descending / newest opened first).
 * If opening timestamps are identical, uses stable secondary key (record id).
 * P&L, winning/losing outcome, status, symbol, and fees have zero influence on sort order.
 */
export const sortTradesChronological = <
  T extends { id?: string; openedAt?: string | number | Date | null; createdAt?: string | number | Date | null; timestamp?: string | number | Date | null }
>(
  trades: T[],
  order: 'desc' | 'asc' = 'desc'
): T[] => {
  return [...trades].sort((a, b) => {
    const timeA = getTradeSortTimestamp(a);
    const timeB = getTradeSortTimestamp(b);
    if (timeA !== timeB) {
      return order === 'asc' ? timeA - timeB : timeB - timeA;
    }
    const idA = String(a?.id || '');
    const idB = String(b?.id || '');
    return order === 'asc' ? idA.localeCompare(idB) : idB.localeCompare(idA);
  });
};
