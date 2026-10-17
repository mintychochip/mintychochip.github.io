/** Labels and door copy. The production build encodes every string in this module. */

export const SECRET_TAB_LABEL = 'Happy Anniversary';

export const VAULT_FROG_LINE = 'Ribbit! A letter is waiting for you.';

export const VAULT_TOAST_LINE = 'Come on in.';

export const SECRET_LOAD_ERROR = 'Secret vault didn’t load.';

export const SECRET_PAGE_TITLE = 'Anniversary';

export interface SecretNavItem {
  id: string;
  label: string;
  href?: string;
  action?: () => void;
}

/** The vault's navigation. Until the letter is open nothing after it exists, so only the letter is offered. */
export function secretPageItems(onLock: () => void, unlocked: boolean): SecretNavItem[] {
  const letter = { id: 'anniversary-letter', label: 'Letter', href: '#anniversary-letter' };
  const lock = { id: 'secret-lock', label: 'Lock vault', action: onLock };
  if (!unlocked) return [letter, lock];
  return [
    letter,
    { id: 'anniversary-passes', label: 'Love passes', href: '#anniversary-passes' },
    { id: 'anniversary-reasons', label: 'Reasons jar', href: '#anniversary-reasons' },
    { id: 'anniversary-wordle', label: "Bumpy's puzzle", href: '#anniversary-wordle' },
    { id: 'anniversary-pond', label: 'Goodnight', href: '#anniversary-pond' },
    lock,
  ];
}
