import type { Draft } from './mail';

const CONTACT_URL = 'https://odin.cs.csub.edu/~jlo/api/contact.php';

export async function sendContact(draft: Draft, website = ''): Promise<void> {
  const res = await fetch(CONTACT_URL, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      name: draft.name.trim(),
      email: draft.email.trim(),
      message: draft.message.trim(),
      website,
    }),
  });
  if (!res.ok) throw new Error(`contact request failed (${res.status})`);

  const body: unknown = await res.json().catch(() => null);
  if (!body || typeof body !== 'object' || !('ok' in body) || body.ok !== true) {
    throw new Error('contact request rejected');
  }
}
