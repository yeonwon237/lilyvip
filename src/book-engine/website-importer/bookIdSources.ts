import { JjwxcUrlParser } from '../jjwxc-source/JjwxcUrlParser';
import { parseShuku52Url } from './adapters/Shuku52Adapter';

/**
 * Sources unlocked by the "Tải Book ID" grant (features.jjwxc_import) in the
 * LilyHub admin — the owner always has it. Add new gated sources here so the
 * permission check and the chapter picker stay in sync.
 */
const BOOK_ID_ADAPTERS = new Set(['jjwxc', '52shuku']);

export const BOOK_ID_LOCKED_MESSAGE = 'Nguồn này cần được admin cấp quyền "Tải Book ID" cho tài khoản của bạn.';

export function isBookIdAdapter(adapterName: string): boolean {
  return BOOK_ID_ADAPTERS.has(adapterName);
}

export function isBookIdSourceUrl(raw: string): boolean {
  const jjwxcUrl = JjwxcUrlParser.toWapUrl(raw) || raw;
  return JjwxcUrlParser.parseNovelUrl(jjwxcUrl) !== null || parseShuku52Url(raw) !== null;
}
