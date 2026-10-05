import type { AnniversaryLetterCopy } from './letter-copy';

export interface VaultReason {
  id: number;
  title: string;
  icon: string;
  body: string;
}

export interface VaultCoupon {
  id: number;
  title: string;
  icon: string;
  desc: string;
}

export interface VaultCopy {
  letter: AnniversaryLetterCopy;
  banner: { clearance: string; heading: string; subheading: string };
  pond: { title: string; idleSpeech: string; loveLines: string[]; button: string };
  letterStamp: string;
  reasons: { title: string; desc: string; items: VaultReason[] };
  coupons: VaultCoupon[];
  wordle: {
    title: string;
    prompt: string;
    target: string;
    hint: string;
    wrong: string;
    solvedTitle: string;
    solvedBody: string;
    keys: string[];
  };
  oracle: { title: string; desc: string };
}
