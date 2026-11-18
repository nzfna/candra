/**
 * @candra/id/format — Indonesian locale formatting on top of the JavaScript Intl APIs.
 * Zero dependencies, tree-shakeable, safe in browsers, Node and edge runtimes.
 * Output depends on the runtime's ICU data; see the cross-runtime snapshot tests.
 */

export const LOCALE = 'id-ID';

/** Indonesian time zones: WIB, WITA, WIT. */
export const TIME_ZONES = {
  WIB: 'Asia/Jakarta',
  WITA: 'Asia/Makassar',
  WIT: 'Asia/Jayapura',
} as const;

/** Documented default; override with the `timeZone` option. */
export const DEFAULT_TIME_ZONE: string = TIME_ZONES.WIB;

type WithLocale<T> = T & { locale?: string };
export type DateInput = Date | number;

const cache = new Map<string, unknown>();
function instance<T>(kind: string, ctor: new (l: string, o?: never) => T, locale: string, opts: object): T {
  const id = `${kind}|${locale}|${JSON.stringify(opts)}`;
  let hit = cache.get(id) as T | undefined;
  if (!hit) {
    hit = new ctor(locale, opts as never);
    cache.set(id, hit);
  }
  return hit;
}

export function formatNumber(value: number, options: WithLocale<Intl.NumberFormatOptions> = {}): string {
  const { locale = LOCALE, ...rest } = options;
  return instance('n', Intl.NumberFormat, locale, rest).format(value);
}

export function formatPercent(fraction: number, options: WithLocale<Intl.NumberFormatOptions> = {}): string {
  return formatNumber(fraction, { style: 'percent', ...options });
}

export interface CurrencyOptions extends WithLocale<Intl.NumberFormatOptions> {
  /** ISO 4217 code. Defaults to IDR. */
  currency?: string;
  /** Compact notation, e.g. “Rp 1,2 jt”. */
  compact?: boolean;
}

export function formatCurrency(value: number, options: CurrencyOptions = {}): string {
  const { currency = 'IDR', compact = false, ...rest } = options;
  const userSetDigits = rest.minimumFractionDigits !== undefined || rest.maximumFractionDigits !== undefined;
  const idrDigits = currency === 'IDR' && !userSetDigits && !compact
    ? { minimumFractionDigits: 0, maximumFractionDigits: 0 }
    : {};
  return formatNumber(value, {
    style: 'currency',
    currency,
    ...(compact ? { notation: 'compact' as const } : {}),
    ...idrDigits,
    ...rest,
  });
}

const DATE_FIELDS = [
  'dateStyle', 'timeStyle', 'weekday', 'era', 'year', 'month', 'day',
  'dayPeriod', 'hour', 'minute', 'second', 'fractionalSecondDigits', 'timeZoneName',
] as const;

function dateFormat(
  value: DateInput,
  options: WithLocale<Intl.DateTimeFormatOptions>,
  defaults: Intl.DateTimeFormatOptions,
): string {
  const { locale = LOCALE, ...rest } = options;
  const hasFields = DATE_FIELDS.some((f) => (rest as Record<string, unknown>)[f] !== undefined);
  const merged = { timeZone: DEFAULT_TIME_ZONE, ...(hasFields ? {} : defaults), ...rest };
  return instance('d', Intl.DateTimeFormat, locale, merged).format(value);
}

/** Default: long date, e.g. “18 November 2026”. */
export const formatDate = (v: DateInput, o: WithLocale<Intl.DateTimeFormatOptions> = {}) =>
  dateFormat(v, o, { dateStyle: 'long' });

/** Default: short time, e.g. “14.30”. */
export const formatTime = (v: DateInput, o: WithLocale<Intl.DateTimeFormatOptions> = {}) =>
  dateFormat(v, o, { timeStyle: 'short' });

export const formatDateTime = (v: DateInput, o: WithLocale<Intl.DateTimeFormatOptions> = {}) =>
  dateFormat(v, o, { dateStyle: 'long', timeStyle: 'short' });

export interface RelativeTimeOptions {
  locale?: string;
  /** Reference point. Defaults to Date.now(). */
  now?: DateInput;
  /** 'auto' yields words such as “kemarin” and “besok”. Default 'auto'. */
  numeric?: Intl.RelativeTimeFormatNumeric;
  style?: Intl.RelativeTimeFormatStyle;
  /** Force a unit instead of picking the largest that fits. */
  unit?: Intl.RelativeTimeFormatUnit;
}

const UNIT_MS: [Intl.RelativeTimeFormatUnit, number][] = [
  ['year', 365.25 * 864e5], ['month', 30.4375 * 864e5], ['day', 864e5],
  ['hour', 36e5], ['minute', 6e4], ['second', 1e3],
];

export function formatRelativeTime(target: DateInput, options: RelativeTimeOptions = {}): string {
  const { locale = LOCALE, now = Date.now(), numeric = 'auto', style = 'long', unit } = options;
  const diff = new Date(target).getTime() - new Date(now).getTime();
  const rtf = instance('r', Intl.RelativeTimeFormat, locale, { numeric, style });
  if (unit) {
    const ms = UNIT_MS.find(([u]) => u === unit || `${u}s` === unit)?.[1] ?? 1e3;
    return rtf.format(Math.round(diff / ms), unit);
  }
  for (const [u, ms] of UNIT_MS) {
    if (Math.abs(diff) >= ms || u === 'second') return rtf.format(Math.round(diff / ms), u);
  }
  return rtf.format(0, 'second');
}

export interface ListOptions {
  locale?: string;
  type?: 'conjunction' | 'disjunction' | 'unit';
  style?: 'long' | 'short' | 'narrow';
}

/** Joins with the Indonesian conjunction (“dan”) or disjunction (“atau”). */
export function formatList(items: readonly string[], options: ListOptions = {}): string {
  const { locale = LOCALE, type = 'conjunction', style = 'long' } = options;
  return instance('l', Intl.ListFormat, locale, { type, style }).format(items);
}

/** e.g. formatUnit(2.5, 'kilogram') → “2,5 kg”. */
export function formatUnit(
  value: number,
  unit: string,
  options: WithLocale<Intl.NumberFormatOptions> = {},
): string {
  return formatNumber(value, { style: 'unit', unit, unitDisplay: 'short', ...options });
}
