import { describe, expect, it } from 'vitest';
import { messages, namespaces, mergeMessages, defineOverrides } from '../src/index';
import { resources } from '../src/i18next';
import { createTranslator } from '../../core/src/index';

describe('pack', () => {
  it('exposes the six MVP namespaces', () => {
    expect([...namespaces]).toEqual(['auth', 'common', 'ecommerce', 'errors', 'navigation', 'validation']);
  });

  it('converts placeholders for i18next but not for ICU', () => {
    expect(messages.validation.minLength).toBe('Minimal {min} karakter');
    expect(resources.id.validation.minLength).toBe('Minimal {{min}} karakter');
  });

  it('i18next and ICU flavors differ only in placeholder syntax', () => {
    const flat = (o: unknown, p = ''): [string, string][] =>
      Object.entries(o as Record<string, unknown>).flatMap(([k, v]) =>
        typeof v === 'string' ? [[`${p}${k}`, v] as [string, string]] : flat(v, `${p}${k}.`),
      );
    const icu = flat(messages);
    const i18 = new Map(flat(resources.id));
    for (const [k, v] of icu) expect(i18.get(k)).toBe(v.replace(/\{(\w+)\}/g, '{{$1}}'));
  });

  it('works with @candra/core end to end', () => {
    const t = createTranslator({ locale: 'id', messages });
    expect(t('auth.login.submit')).toBe('Masuk');
    expect(t('auth.password.linkSent', { email: 'budi@contoh.id' })).toBe('Tautan telah dikirim ke budi@contoh.id');
    expect(t.scope('checkout' as never)).toBeTypeOf('function');
  });
});

describe('overrides', () => {
  it('merges deeply without mutating the pack', () => {
    const o = defineOverrides({ auth: { login: { title: 'Selamat datang' } } });
    const merged = mergeMessages(messages, o);
    expect(merged.auth.login.title).toBe('Selamat datang');
    expect(merged.auth.login.submit).toBe('Masuk');
    expect(messages.auth.login.title).toBe('Masuk');
  });

  it('ignores prototype-polluting keys', () => {
    const evil = JSON.parse('{"__proto__":{"polluted":"yes"}}');
    mergeMessages({ a: { b: 'x' } }, evil);
    expect(({} as Record<string, unknown>).polluted).toBeUndefined();
  });
});
