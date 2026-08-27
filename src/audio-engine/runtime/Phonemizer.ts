/**
 * Phonemizer & Tokenizer for Piper / NghiTTS Vietnamese Models
 * Maps Vietnamese text into token IDs matching config.json phoneme_id_map
 */
import { normalizeForSpeech } from '../TtsTextPreprocessor';

// Exact phoneme ID mapping from NghiTTS config.json
export const PHONEME_ID_MAP: Record<string, number> = {
  "_": 0,
  "^": 1,
  "$": 2,
  " ": 3,
  "!": 4,
  "'": 5,
  "(": 6,
  ")": 7,
  ",": 8,
  "-": 9,
  ".": 10,
  ":": 11,
  ";": 12,
  "?": 13,
  "a": 14,
  "b": 15,
  "c": 16,
  "d": 17,
  "e": 18,
  "f": 19,
  "h": 20,
  "i": 21,
  "j": 22,
  "k": 23,
  "l": 24,
  "m": 25,
  "n": 26,
  "o": 27,
  "p": 28,
  "q": 29,
  "r": 30,
  "s": 31,
  "t": 32,
  "u": 33,
  "v": 34,
  "w": 35,
  "x": 36,
  "y": 37,
  "z": 38,
  "à": 14,
  "á": 14,
  "ả": 14,
  "ã": 14,
  "ạ": 14,
  "ă": 14,
  "ằ": 14,
  "ắ": 14,
  "ẳ": 14,
  "ẵ": 14,
  "ặ": 14,
  "â": 14,
  "ầ": 14,
  "ấ": 14,
  "ẩ": 14,
  "ẫ": 14,
  "ậ": 14,
  "è": 18,
  "é": 18,
  "ẻ": 18,
  "ẽ": 18,
  "ẹ": 18,
  "ê": 18,
  "ề": 18,
  "ế": 18,
  "ể": 18,
  "ễ": 18,
  "ệ": 18,
  "ì": 21,
  "í": 21,
  "ỉ": 21,
  "ĩ": 21,
  "ị": 21,
  "ò": 27,
  "ó": 27,
  "ỏ": 27,
  "õ": 27,
  "ọ": 27,
  "ô": 27,
  "ồ": 27,
  "ố": 27,
  "ổ": 27,
  "ỗ": 27,
  "ộ": 27,
  "ơ": 27,
  "ờ": 27,
  "ớ": 27,
  "ở": 27,
  "ỡ": 27,
  "ợ": 27,
  "ù": 33,
  "ú": 33,
  "ủ": 33,
  "ũ": 33,
  "ụ": 33,
  "ư": 33,
  "ừ": 33,
  "ứ": 33,
  "ử": 33,
  "ữ": 33,
  "ự": 33,
  "ỳ": 37,
  "ý": 37,
  "ỷ": 37,
  "ỹ": 37,
  "ỵ": 37,
  "đ": 17,
};

/**
 * Converts Vietnamese text to token ID sequence format:
 * [1, pad, id_1, pad, id_2, ..., id_n, pad, 2]
 */
export function textToPhonemeSequence(text: string): number[] {
  const clean = normalizeForSpeech(text).toLowerCase().trim();
  const sequence: number[] = [1]; // Start symbol '^'

  for (let i = 0; i < clean.length; i++) {
    const char = clean[i];
    let id: number | undefined = PHONEME_ID_MAP[char];

    if (id === undefined) {
      // Fallback for unknown character
      if (/[0-9]/.test(char)) {
        id = 14 + (char.charCodeAt(0) % 25);
      } else {
        id = 3; // Space
      }
    }

    sequence.push(id);
    sequence.push(0); // Inter-phoneme padding '_'
  }

  sequence.push(2); // End symbol '$'
  return sequence;
}
