export interface Draft {
  name: string;
  email: string;
  message: string;
}

export type DraftErrors = Partial<Record<keyof Draft, string>>;

const EMAIL = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

export function validate(d: Draft): DraftErrors {
  const errors: DraftErrors = {};
  if (!d.name.trim()) errors.name = 'Add your name.';
  if (!d.email.trim()) errors.email = 'Add your email so I can reply.';
  else if (!EMAIL.test(d.email.trim())) errors.email = 'That email doesn’t look right.';
  if (!d.message.trim()) errors.message = 'Write a message.';
  return errors;
}

export function mailto(to: string, d: Draft): string {
  const name = d.name.trim();
  const subject = `Portfolio inquiry from ${name}`;
  const body = `${d.message.trim()}\n\n${name}\n${d.email.trim()}`;
  return `mailto:${to}?subject=${encodeURIComponent(subject)}&body=${encodeURIComponent(body)}`;
}
