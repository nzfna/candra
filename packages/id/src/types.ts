import type { IdMessages } from './generated/messages';

export type { IdMessages };
export type IdNamespace = keyof IdMessages & string;

type Paths<T> = T extends string
  ? never
  : { [K in keyof T & string]: T[K] extends string ? K : `${K}.${Paths<T[K]>}` }[keyof T & string];

type ValueAt<T, P extends string> = P extends `${infer H}.${infer R}`
  ? H extends keyof T
    ? ValueAt<T[H], R>
    : never
  : P extends keyof T
    ? T[P]
    : never;

type PlaceholderNames<S> = S extends `${string}{${infer N}}${infer Rest}` ? N | PlaceholderNames<Rest> : never;

/** Dot-path keys inside one namespace, e.g. IdMessageKey<'auth'> = 'login.title' | ... */
export type IdMessageKey<NS extends IdNamespace = IdNamespace> = NS extends IdNamespace
  ? Paths<IdMessages[NS]>
  : never;

/** Fully-qualified keys, e.g. 'auth.login.title'. */
export type IdFullKey = { [NS in IdNamespace]: `${NS}.${Paths<IdMessages[NS]>}` }[IdNamespace];

/** Placeholder values required by a fully-qualified key; `undefined` when it has none. */
export type IdMessageValues<K extends IdFullKey> = [PlaceholderNames<ValueAt<IdMessages, K>>] extends [never]
  ? undefined
  : Record<PlaceholderNames<ValueAt<IdMessages, K>>, string | number>;

export type DeepPartial<T> = { [K in keyof T]?: T[K] extends string ? string : DeepPartial<T[K]> };
/** Shape of a consumer override object; unknown or renamed keys fail to compile. */
export type DeepPartialMessages = DeepPartial<IdMessages>;
