import type { DeepPartial, DeepPartialMessages } from './types';

/** Identity helper that type-checks an override object against the pack. */
export function defineOverrides<const T extends DeepPartialMessages>(overrides: T): T {
  return overrides;
}

const UNSAFE = new Set(['__proto__', 'constructor', 'prototype']);

/** Immutable deep merge: returns a new tree with `overrides` applied over `base`. */
export function mergeMessages<T extends object>(base: T, overrides: DeepPartial<T>): T {
  const out: Record<string, unknown> = { ...(base as Record<string, unknown>) };
  for (const [k, v] of Object.entries(overrides as Record<string, unknown>)) {
    if (UNSAFE.has(k) || v === undefined) continue;
    const current = out[k];
    out[k] =
      v !== null && typeof v === 'object' && current !== null && typeof current === 'object'
        ? mergeMessages(current as object, v as DeepPartial<object>)
        : v;
  }
  return out as T;
}
