/**
 * Shape of the anniversary letter.
 *
 * The words themselves live in the sealed vault payload, not in this file.
 * The 3D card and the plain-text section both render whatever copy is passed in.
 */
export interface AnniversaryLetterCopy {
  /** Front cover of the card. */
  cover: { kicker: string; title: string };
  greeting: string;
  paragraphs: string[];
  signoff: string;
  /** Rendered with a drawn heart on the card; the HTML section appends its own. */
  signature: string;
  /** Small line closing the inside spread, pointing at the passes below. */
  postscript: string;
}
