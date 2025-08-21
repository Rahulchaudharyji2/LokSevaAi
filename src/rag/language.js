import { franc } from 'franc-min';

export function detectLang(text) {
  const code = franc(text || '', { minLength: 3 });
  if (code === 'hin') return 'hi';
  if (code === 'eng') return 'en';
  return 'other';
}
