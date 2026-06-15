/*
 * Date helpers for rendering JSON Resume dates, which are ISO strings like
 * "2021-03" or "2021-03-01". An empty/omitted end date means "Present".
 */

const MONTHS = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];

/** Format an ISO resume date as "Mon YYYY", or "YYYY" if no month is present. */
export function formatDate(iso: string | undefined): string {
  if (!iso) return '';
  const [year, month] = iso.split('-');
  if (!month) return year;
  const index = Number(month) - 1;
  const label = MONTHS[index];
  return label ? `${label} ${year}` : year;
}

/** Format a start/end pair as "Mon YYYY – Mon YYYY" (or "– Present"). */
export function formatDateRange(start: string, end?: string): string {
  const startLabel = formatDate(start);
  const endLabel = end ? formatDate(end) : 'Present';
  return `${startLabel} – ${endLabel}`;
}
