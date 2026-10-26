/** Delivery promise from the Shipping page: 1–3 days to prepare, then about 7–15 business days on the way. */
export const PREP_DAYS = [1, 3] as const;
export const TRANSIT_BUSINESS_DAYS = [7, 15] as const;

function addBusinessDays(from: Date, days: number) {
  const date = new Date(from);
  let left = days;
  while (left > 0) {
    date.setDate(date.getDate() + 1);
    const day = date.getDay();
    if (day !== 0 && day !== 6) left -= 1;
  }
  return date;
}

/** Earliest and latest arrival for an order placed on `today`. */
export function deliveryWindow(today = new Date()): [Date, Date] {
  return [addBusinessDays(today, PREP_DAYS[0] + TRANSIT_BUSINESS_DAYS[0]), addBusinessDays(today, PREP_DAYS[1] + TRANSIT_BUSINESS_DAYS[1])];
}

export function formatWindow([first, last]: [Date, Date], locale = 'en-US') {
  const short = (date: Date) => date.toLocaleDateString(locale, { month: 'short', day: 'numeric' });
  return `${short(first)} – ${short(last)}`;
}
