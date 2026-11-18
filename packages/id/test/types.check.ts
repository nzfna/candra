import { messages } from '../src/index';
import { createTranslator } from '../../core/src/index';
import { defineOverrides, mergeMessages } from '../src/overrides';
import type { IdFullKey, IdMessageKey, IdMessageValues } from '../src/types';

const k1: IdFullKey = 'auth.login.title';
const k2: IdMessageKey<'validation'> = 'minLength';
const v: IdMessageValues<'validation.minLength'> = { min: 8 };
const none: IdMessageValues<'auth.login.title'> = undefined;
void [k1, k2, v, none];

// @ts-expect-error unknown full key
const bad1: IdFullKey = 'auth.login.nope';
// @ts-expect-error key from another namespace
const bad2: IdMessageKey<'auth'> = 'minLength';
// @ts-expect-error missing placeholder value
const bad3: IdMessageValues<'validation.minLength'> = {};
void [bad1, bad2, bad3];

// Core is generic over the real pack: keys autocomplete and placeholders are enforced.
const t = createTranslator({ locale: 'id', messages });
t('auth.login.title');
t('validation.minLength', { min: 8 });
t('auth.password.linkSent', { email: 'a@b.id' });
// @ts-expect-error missing {email}
t('auth.password.linkSent');
// @ts-expect-error unknown key
t('auth.login.titel');

// Overrides are type-checked against the pack.
defineOverrides({ auth: { login: { title: 'Selamat datang' } } });
// @ts-expect-error renamed/unknown key in override
defineOverrides({ auth: { login: { titel: 'x' } } });
mergeMessages(messages, { common: { actions: { save: 'Simpan perubahan' } } });
