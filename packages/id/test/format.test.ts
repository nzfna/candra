import { describe, expect, it } from 'vitest';
import {
  DEFAULT_TIME_ZONE, TIME_ZONES, formatCurrency, formatDate, formatDateTime, formatList,
  formatNumber, formatPercent, formatRelativeTime, formatTime, formatUnit,
} from '../src/format';

// ICU may emit non-breaking spaces; normalise so snapshots are stable across runtimes.
const n = (s: string) => s.replace(/[\u00a0\u202f]/g, ' ');
const at = new Date('2026-11-18T07:30:00Z'); // 14.30 WIB

describe('numbers and currency', () => {
  it('formats IDR without decimals using Indonesian separators', () => {
    expect(n(formatCurrency(1_500_000))).toBe('Rp 1.500.000');
  });
  it('supports other currencies and compact notation', () => {
    expect(n(formatCurrency(1234.5, { currency: 'USD' }))).toBe('US$1.234,50');
    expect(n(formatCurrency(1_200_000, { compact: true }))).toBe('Rp 1,2 jt');
  });
  it('lets callers override fraction digits without RangeError', () => {
    expect(n(formatCurrency(1500.5, { minimumFractionDigits: 2 }))).toBe('Rp 1.500,50');
  });
  it('uses dot for thousands and comma for decimals', () => {
    expect(formatNumber(1234567.891)).toBe('1.234.567,891');
    expect(n(formatPercent(0.255, { maximumFractionDigits: 1 }))).toBe('25,5%');
  });
});

describe('dates and time zones', () => {
  it('defaults to WIB and long dates', () => {
    expect(DEFAULT_TIME_ZONE).toBe(TIME_ZONES.WIB);
    expect(formatDate(at)).toBe('18 November 2026');
    expect(formatTime(at)).toBe('14.30');
    expect(n(formatDateTime(at))).toBe('18 November 2026 pukul 14.30');
  });
  it('supports WITA and WIT explicitly', () => {
    expect(formatTime(at, { timeZone: TIME_ZONES.WITA })).toBe('15.30');
    expect(formatTime(at, { timeZone: TIME_ZONES.WIT })).toBe('16.30');
  });
  it('respects explicit style options', () => {
    expect(formatDate(at, { dateStyle: 'medium' })).toBe('18 Nov 2026');
  });
});

describe('relative time, lists, units', () => {
  const ago = (ms: number) => new Date(+at + ms);
  it('uses words for adjacent days', () => {
    expect(formatRelativeTime(ago(-864e5), { now: at })).toBe('kemarin');
    expect(formatRelativeTime(ago(864e5), { now: at })).toBe('besok');
    expect(formatRelativeTime(at, { now: at })).toBe('sekarang');
  });
  it('picks the largest fitting unit', () => {
    expect(formatRelativeTime(ago(-3 * 36e5), { now: at })).toBe('3 jam yang lalu');
    expect(formatRelativeTime(ago(5 * 6e4), { now: at })).toBe('dalam 5 menit');
    expect(formatRelativeTime(ago(-65 * 864e5), { now: at })).toBe('2 bulan yang lalu');
  });
  it('joins lists with dan / atau', () => {
    expect(formatList(['apel', 'jeruk', 'mangga'])).toBe('apel, jeruk, dan mangga');
    expect(formatList(['apel', 'jeruk'])).toBe('apel dan jeruk');
    expect(formatList(['apel', 'jeruk', 'mangga'], { type: 'disjunction' })).toBe('apel, jeruk, atau mangga');
  });
  it('formats units', () => {
    expect(n(formatUnit(2.5, 'kilogram'))).toBe('2,5 kg');
  });
});
