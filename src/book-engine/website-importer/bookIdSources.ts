import { JjwxcUrlParser } from '../jjwxc-source/JjwxcUrlParser';
import { parseShuku52Url } from './adapters/Shuku52Adapter';

/** Website sources whose chapters can be selected before importing. */
const BOOK_ID_ADAPTERS = new Set(['jjwxc', '52shuku']);

export function isBookIdAdapter(adapterName: string): boolean {
  return BOOK_ID_ADAPTERS.has(adapterName);
}

export function isBookIdSourceUrl(raw: string): boolean {
  const jjwxcUrl = JjwxcUrlParser.toWapUrl(raw) || raw;
  return JjwxcUrlParser.parseNovelUrl(jjwxcUrl) !== null || parseShuku52Url(raw) !== null;
}
