/** Labels and door copy. The production build encodes every string in this module. */

export const SECRET_TAB_LABEL = 'Happy Anniversary';

export const VAULT_FROG_LINE = 'The vault is sealed. 🔒';

export const VAULT_TOAST_LINE = 'The vault door is shut.';

export const SECRET_LOAD_ERROR = 'Secret vault didn’t load.';

export const SECRET_PAGE_HEADING = { title: 'ANNIVERSARY', tag: 'THIS PAGE', icon: '💖' };

export interface SecretNavItem {
  id: string;
  label: string;
  icon?: string;
  href?: string;
  badge?: string;
  action?: () => void;
}

export function secretPageItems(onLock: () => void): SecretNavItem[] {
  return [
    { id: 'anniversary-letter3d', label: 'Sealed Letter', icon: '✉️', href: '#anniversary-letter3d' },
    { id: 'anniversary-pond', label: 'Frog Pond', icon: '🐸', href: '#anniversary-pond' },
    { id: 'anniversary-letter', label: 'Love Letter', icon: '💌', href: '#anniversary-letter' },
    { id: 'anniversary-reasons', label: '8 Reasons Why', icon: '✨', href: '#anniversary-reasons' },
    { id: 'anniversary-coupons', label: 'Love Vouchers', icon: '🎟️', href: '#anniversary-coupons' },
    { id: 'anniversary-wordle', label: 'Mini Wordle', icon: '🟩', href: '#anniversary-wordle' },
    { id: 'anniversary-oracle', label: 'Wordle Oracle', icon: '🔮', href: '#anniversary-oracle' },
    { id: 'secret-lock', label: 'Lock Page', icon: '🔒', action: onLock },
  ];
}
