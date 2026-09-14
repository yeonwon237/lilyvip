import { WebsiteImporter } from '../../src/book-engine/website-importer/WebsiteImporter';
import type { CandidateBook } from '../../src/book-engine/website-importer/types';
import type { BookSourceMeta } from '../../src/book-engine/types';
import { buildBackupEnvelope } from './backup-builder';
import { gzipEnvelope, uploadBook } from './gzip-upload';
import { cloudId } from './cloud-id';
import { registryId } from './dedupe';

export interface FetchAndUploadResult {
  bookId: string;
  cloudId: string;
}

/** Only ever called once a candidate is confirmed 'completed' — never uploads a partial book. */
export async function fetchAndUploadCandidate(
  candidate: CandidateBook,
  baseUrl: string,
  ownerKey: string,
): Promise<FetchAndUploadResult> {
  const { draft, failedChapters, isCancelled } = await WebsiteImporter.fetchAndBuildDraft(candidate, { concurrency: 4 });
  if (isCancelled) throw new Error('Quá trình tải chương bị hủy.');
  if (failedChapters.length > 0) {
    throw new Error(`Còn ${failedChapters.length} chương tải lỗi — không upload truyện thiếu chương.`);
  }

  const sourceMeta: BookSourceMeta = {
    type: 'website',
    adapter: candidate.adapterName,
    url: candidate.sourceUrl,
    hostname: candidate.hostname,
    importedAt: new Date().toISOString(),
  };

  // Deterministic, derived from sourceUrl (not Date.now()) so a retry after a
  // failed registry write re-uploads to the SAME cloud id instead of leaving
  // an orphaned duplicate behind.
  const bookId = `story-bot-${registryId(candidate.sourceUrl)}`;
  const { book, envelope } = buildBackupEnvelope(draft, sourceMeta, bookId);
  const gz = gzipEnvelope(envelope);
  const id = cloudId(book.id);
  await uploadBook(baseUrl, ownerKey, id, gz, book.title, book.author, book.coverUrl, book.coverColor);
  return { bookId: book.id, cloudId: id };
}
