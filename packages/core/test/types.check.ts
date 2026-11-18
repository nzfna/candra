import { createTranslator } from '../src/index';

const messages = {
  auth: { login: { title: 'Masuk' } },
  validation: { minLength: 'Minimal {min} karakter', range: '{from}–{to}' },
} as const;

const t = createTranslator({ locale: 'id', messages });

t('auth.login.title');
t('validation.minLength', { min: 8 });
t('validation.range', { from: 1, to: 5 });
t.scope('validation')('minLength', { min: 3 });

// @ts-expect-error unknown key
t('auth.login.nope');
// @ts-expect-error missing required placeholder values
t('validation.minLength');
// @ts-expect-error wrong placeholder name
t('validation.minLength', { max: 8 });
// @ts-expect-error values passed to a message without placeholders
t('auth.login.title', { x: 1 });
// @ts-expect-error a namespace is not a leaf key
t('auth');
