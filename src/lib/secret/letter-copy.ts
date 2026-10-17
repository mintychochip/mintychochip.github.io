/**
 * Shape of the anniversary letter.
 *
 * The words themselves live in the sealed vault payload, not in this file.
 */
export interface AnniversaryLetterCopy {
  /** Over the pond while the letter is still sealed. */
  title: string;
  /** One line under the pond, naming who the letter is for. */
  dedication: string;
  greeting: string;
  paragraphs: string[];
  signoff: string;
  /** Followed by a drawn heart. */
  signature: string;
  /** Small line closing the letter, pointing at the passes below. */
  postscript: string;
}
