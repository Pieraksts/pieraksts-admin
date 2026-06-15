// Display formatters. Money is a euro number matching the DB's numeric(12, 2).

const eur = new Intl.NumberFormat("en-IE", {
  style: "currency",
  currency: "EUR",
});

/** Format a euro amount with 2 decimals, e.g. 62 -> "€62.00". */
export function formatMoney(euros: number): string {
  return eur.format(euros);
}

/** Format commission basis points as a percent, e.g. 500 -> "5%". */
export function formatRate(bps: number): string {
  const pct = bps / 100;
  return `${Number.isInteger(pct) ? pct : pct.toFixed(2)}%`;
}

const dateFmt = new Intl.DateTimeFormat("en-GB", {
  day: "2-digit",
  month: "short",
  year: "numeric",
});

/** Format an ISO date (YYYY-MM-DD) as e.g. "31 Dec 2026". */
export function formatDate(iso: string | null): string {
  if (!iso) return "—";
  return dateFmt.format(new Date(iso));
}
