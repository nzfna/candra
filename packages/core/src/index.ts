/**
 * @candra/core — optional, dependency-free translation engine.
 *
 * Rules (spec §6.4): no React/framework imports, no 'use client', no module-level
 * mutable state, so instances are safe across concurrent server requests.
 */

export type MessageTree = { readonly [key: string]: string | MessageTree };
export type Values = Record<string, string | number>;

/** Dot-path union of every leaf key in a message tree. */
export type Paths<T> = T extends string
  ? never
  : { [K in keyof T & string]: T[K] extends string ? K : `${K}.${Paths<T[K]>}` }[keyof T & string];

/** The message type found at a dot-path. */
export type ValueAt<T, P extends string> = P extends `${infer H}.${infer R}`
  ? H extends keyof T
    ? ValueAt<T[H], R>
    : never
  : P extends keyof T
    ? T[P]
    : never;

/** Names of `{placeholder}` arguments inside a literal message type. */
export type Placeholders<S> = S extends string
  ? string extends S
    ? string
    : S extends `${string}{${infer N}}${infer Rest}`
      ? N | Placeholders<Rest>
      : never
  : never;

/** Rest-argument tuple: required values when the message has placeholders, none otherwise. */
export type ValuesArg<S> = string extends S
  ? [values?: Values]
  : [Placeholders<S>] extends [never]
    ? []
    : [values: Record<Placeholders<S>, string | number>];

export interface ScopedTranslator<M> {
  <K extends Paths<M>>(key: K, ...args: ValuesArg<ValueAt<M, K>>): string;
}

export interface Translator<M> extends ScopedTranslator<M> {
  readonly locale: string;
  /** True if the key exists in the requested locale (fallback is not consulted). */
  has(key: string): boolean;
  /** Translator bound to one namespace, e.g. `t.scope('checkout')('shippingAddress')`. */
  scope<N extends keyof M & string>(namespace: N): ScopedTranslator<M[N]>;
}

export interface CreateTranslatorOptions<M extends MessageTree> {
  locale: string;
  messages: M;
  fallback?: { locale: string; messages: MessageTree };
  /** Called when a key is absent from the requested locale. */
  onMissing?: (key: string, locale: string) => void;
  /** Called when a message needs a value that was not supplied. */
  onMissingValue?: (key: string, name: string) => void;
}

const hasOwn = (o: object, k: string) => Object.prototype.hasOwnProperty.call(o, k);

function lookup(tree: MessageTree, path: string): string | undefined {
  let cur: string | MessageTree = tree;
  for (const part of path.split('.')) {
    if (typeof cur !== 'object' || !hasOwn(cur, part)) return undefined;
    cur = cur[part] as string | MessageTree;
  }
  return typeof cur === 'string' ? cur : undefined;
}

const PLACEHOLDER = /\{([A-Za-z][A-Za-z0-9]*)\}/g;

declare const console: { warn(...args: unknown[]): void };
function isDev(): boolean {
  const env = (globalThis as { process?: { env?: Record<string, string | undefined> } }).process?.env;
  return env?.NODE_ENV !== undefined && env.NODE_ENV !== 'production';
}

export function createTranslator<const M extends MessageTree>(
  options: CreateTranslatorOptions<M>,
): Translator<M> {
  const { locale, messages, fallback, onMissing, onMissingValue } = options;

  const translate = (key: string, values?: Values): string => {
    let template = lookup(messages, key);
    if (template === undefined) {
      onMissing?.(key, locale);
      template = fallback ? lookup(fallback.messages, key) : undefined;
      if (template === undefined) return key; // never throws; the key itself is the last resort
    }
    return template.replace(PLACEHOLDER, (match, name: string) => {
      const value = values?.[name];
      if (value === undefined) {
        if (onMissingValue) onMissingValue(key, name);
        else if (isDev()) console.warn(`[candra] missing value “${name}” for key “${key}”`);
        return match; // leave the placeholder visible
      }
      return String(value);
    });
  };

  const t = ((key: string, values?: Values) => translate(key, values)) as unknown as Translator<M>;
  Object.defineProperties(t, {
    locale: { value: locale, enumerable: true },
    has: { value: (key: string) => lookup(messages, key) !== undefined },
    scope: {
      value: (namespace: string) => (key: string, values?: Values) => translate(`${namespace}.${key}`, values),
    },
  });
  return t;
}
