import { describe, expect, it } from 'vitest';
import { createTranslator } from '../src/index';

const id = {
  auth: { login: { title: 'Masuk' } },
  validation: { minLength: 'Minimal {min} karakter', range: '{from}–{to}' },
  onlyId: { greeting: 'Halo, {name}!' },
} as const;
const en = {
  auth: { login: { title: 'Log in' } },
  fallbackOnly: { hello: 'Hello' },
};

describe('createTranslator', () => {
  it('looks up nested keys', () => {
    const t = createTranslator({ locale: 'id', messages: id });
    expect(t('auth.login.title')).toBe('Masuk');
  });

  it('interpolates values (numbers and strings)', () => {
    const t = createTranslator({ locale: 'id', messages: id });
    expect(t('validation.minLength', { min: 8 })).toBe('Minimal 8 karakter');
    expect(t('validation.range', { from: 1, to: 5 })).toBe('1–5');
  });

  it('falls back to the fallback locale, then to the key', () => {
    const missing: string[] = [];
    const t = createTranslator({
      locale: 'id',
      messages: id,
      fallback: { locale: 'en', messages: en },
      onMissing: (k, l) => missing.push(`${l}:${k}`),
    });
    expect((t as unknown as (k: string) => string)('fallbackOnly.hello')).toBe('Hello');
    expect((t as unknown as (k: string) => string)('nope.nothing')).toBe('nope.nothing');
    expect(missing).toEqual(['id:fallbackOnly.hello', 'id:nope.nothing']);
  });

  it('leaves the placeholder visible and reports a missing value', () => {
    const reported: string[] = [];
    const t = createTranslator({
      locale: 'id',
      messages: id,
      onMissingValue: (k, n) => reported.push(`${k}:${n}`),
    });
    const loose = t as unknown as (k: string, v?: Record<string, string>) => string;
    expect(loose('onlyId.greeting', {})).toBe('Halo, {name}!');
    expect(reported).toEqual(['onlyId.greeting:name']);
  });

  it('has() checks the requested locale only', () => {
    const t = createTranslator({ locale: 'id', messages: id, fallback: { locale: 'en', messages: en } });
    expect(t.has('auth.login.title')).toBe(true);
    expect(t.has('fallbackOnly.hello')).toBe(false);
    expect(t.has('auth')).toBe(false); // namespaces are not leaves
  });

  it('scope() binds a namespace', () => {
    const t = createTranslator({ locale: 'id', messages: id });
    expect(t.scope('validation')('minLength', { min: 3 })).toBe('Minimal 3 karakter');
  });

  it('is not fooled by prototype keys', () => {
    const t = createTranslator({ locale: 'id', messages: id });
    const loose = t as unknown as (k: string) => string;
    expect(loose('constructor')).toBe('constructor');
    expect(loose('auth.__proto__.x')).toBe('auth.__proto__.x');
    expect(t.has('toString')).toBe(false);
  });

  it('keeps instances independent (no shared module state)', () => {
    const a = createTranslator({ locale: 'id', messages: { x: { y: 'A' } } as const });
    const b = createTranslator({ locale: 'id', messages: { x: { y: 'B' } } as const });
    expect(a('x.y')).toBe('A');
    expect(b('x.y')).toBe('B');
  });
});
