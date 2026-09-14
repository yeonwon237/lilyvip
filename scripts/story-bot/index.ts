import { WebsiteImporter } from '../../src/book-engine/website-importer/WebsiteImporter';
import { listRegistry, putRegistryEntry, BASE_URL, OWNER_KEY } from './registry-client';
import { findRegistryMatch, pickMatchingCandidate, registryId } from './dedupe';
import { fetchAndUploadCandidate } from './fetch-and-upload';
import { searchWattpadStories } from '../../src/book-engine/website-importer/wattpad-search';
import type { RegistryEntry, RegistryPlatform } from './types';

const args = process.argv.slice(2);
const dryRun = args.includes('--dry-run');
const positional = args.filter(value => !value.startsWith('--'));
const [command, arg1] = positional;

function platformFor(adapterName: string): RegistryPlatform {
  if (adapterName === 'wattpad') return 'wattpad';
  if (adapterName === 'blogspot') return 'blogspot';
  return 'wordpress';
}

async function upsert(id: string, entry: Partial<RegistryEntry>): Promise<void> {
  if (dryRun) {
    console.log(`  [dry-run] sẽ ghi registry/${id}:`, entry);
    return;
  }
  await putRegistryEntry(id, entry);
}

async function cmdAdd(url: string): Promise<void> {
  if (!url) throw new Error('Cần truyền URL: tsx scripts/story-bot/index.ts add <url>');

  const entries = await listRegistry();
  const result = await WebsiteImporter.analyze(url);
  // A blog root URL can hold multiple separate stories (one per category) —
  // process every candidate found, not just the first, or every story on
  // the blog past the first one is silently dropped.
  if (!result.candidateBooks.length) throw new Error('Không tìm thấy truyện nào tại URL này.');

  for (const candidate of result.candidateBooks) {
    const existing = findRegistryMatch(entries, { sourceUrl: candidate.sourceUrl, title: candidate.title, author: candidate.author });
    if (existing) {
      console.log(`- "${candidate.title}": đã có trong registry (status=${existing.status}) — bỏ qua để tránh trùng.`);
      continue;
    }

    const platform = platformFor(candidate.adapterName);
    // WordPress/Blogspot: the human already chose this specific link/site —
    // no completion gate, fetch straight to Cloud regardless of status.
    // Wattpad direct links keep the completion gate (see cmdDiscover too).
    const skipGate = platform !== 'wattpad';
    const completion = candidate.completion || 'unknown';
    const id = registryId(candidate.sourceUrl, candidate.title);
    const nowIso = new Date().toISOString();

    if (skipGate || completion === 'completed') {
      if (dryRun) {
        console.log(`- [dry-run] "${candidate.title}" — sẽ tải ${candidate.totalChapters} chương, upload lên cloud.`);
        continue;
      }
      console.log(`- "${candidate.title}" — đang tải và upload.`);
      const { bookId, cloudId } = await fetchAndUploadCandidate(candidate, BASE_URL, OWNER_KEY);
      const entry: RegistryEntry = {
        id, title: candidate.title, author: candidate.author, sourceUrl: candidate.sourceUrl,
        platform, status: 'fetched', completion, chapterCount: candidate.totalChapters,
        bookId: cloudId, addedAt: nowIso, lastCheckedAt: nowIso,
      };
      await upsert(id, entry);
      entries.push(entry);
      console.log(`  Đã upload: bookId=${bookId} cloudId=${cloudId}`);
    } else {
      const entry: RegistryEntry = {
        id, title: candidate.title, author: candidate.author, sourceUrl: candidate.sourceUrl,
        platform, status: 'watching', completion, chapterCount: candidate.totalChapters,
        addedAt: nowIso, lastCheckedAt: nowIso,
      };
      await upsert(id, entry);
      entries.push(entry);
      console.log(`- "${candidate.title}": đã thêm vào danh sách theo dõi (completion=${completion}, ${candidate.totalChapters} chương).`);
    }
  }
}

async function cmdSweep(): Promise<void> {
  const entries = await listRegistry();
  const watching = entries.filter(entry => entry.status === 'watching');
  console.log(`Đang theo dõi ${watching.length} nguồn.`);

  for (const entry of watching) {
    try {
      const result = await WebsiteImporter.analyze(entry.sourceUrl);
      const candidate = pickMatchingCandidate(result.candidateBooks, entry);
      if (!candidate) {
        console.log(`- ${entry.title}: không phân tích được lần này, bỏ qua.`);
        continue;
      }
      const completion = candidate.completion || 'unknown';

      if (completion !== 'completed') {
        await upsert(entry.id, { ...entry, completion, chapterCount: candidate.totalChapters });
        console.log(`- ${entry.title}: vẫn ${completion} (${candidate.totalChapters} chương).`);
        continue;
      }

      if (dryRun) {
        console.log(`- ${entry.title}: [dry-run] đã hoàn thành — sẽ tải ${candidate.totalChapters} chương và upload.`);
        continue;
      }

      console.log(`- ${entry.title}: đã hoàn thành — đang tải và upload.`);
      const { bookId, cloudId } = await fetchAndUploadCandidate(candidate, BASE_URL, OWNER_KEY);
      await upsert(entry.id, { ...entry, status: 'fetched', completion, chapterCount: candidate.totalChapters, bookId: cloudId });
      console.log(`  Đã upload: bookId=${bookId} cloudId=${cloudId}`);
    } catch (error) {
      console.error(`- ${entry.title}: lỗi khi kiểm tra — ${error instanceof Error ? error.message : error}`);
    }
    // A courtesy gap between sources in the same run, not required by any source's rate limit today.
    await new Promise(resolve => setTimeout(resolve, 1500));
  }
}

// No more "pending"/approve step: a search result found here is processed
// immediately (fetch if completed, watch if not) — same completion gate as
// cmdSweep, since Wattpad's own `completed` flag is reliable enough to trust
// without a human double-check.
async function cmdDiscover(keyword: string): Promise<void> {
  if (!keyword) throw new Error('Cần truyền từ khóa: tsx scripts/story-bot/index.ts discover <từ khóa>');

  let entries = await listRegistry();
  const results = await searchWattpadStories(keyword);
  let fetchedCount = 0;
  let watchingCount = 0;
  let skipped = 0;

  for (const result of results) {
    const existing = findRegistryMatch(entries, { sourceUrl: result.sourceUrl, title: result.title, author: result.author });
    if (existing) { skipped += 1; continue; }

    const id = registryId(result.sourceUrl, result.title);
    const nowIso = new Date().toISOString();

    if (result.completion === 'completed') {
      if (dryRun) { console.log(`+ [dry-run] "${result.title}" đã hoàn thành — sẽ tải và upload.`); continue; }
      const { bookId, cloudId } = await fetchAndUploadCandidate(
        (await WebsiteImporter.analyze(result.sourceUrl)).candidateBooks[0], BASE_URL, OWNER_KEY,
      );
      const entry: RegistryEntry = {
        id, title: result.title, author: result.author, sourceUrl: result.sourceUrl,
        platform: 'wattpad', status: 'fetched', completion: result.completion, chapterCount: result.totalChapters,
        bookId: cloudId, addedAt: nowIso, lastCheckedAt: nowIso, discoveredVia: 'wattpad-search', searchKeyword: keyword,
      };
      await upsert(id, entry);
      entries.push(entry);
      fetchedCount += 1;
      console.log(`+ [completed] "${result.title}" — đã upload bookId=${bookId} cloudId=${cloudId}`);
    } else {
      const entry: RegistryEntry = {
        id, title: result.title, author: result.author, sourceUrl: result.sourceUrl,
        platform: 'wattpad', status: 'watching', completion: result.completion, chapterCount: result.totalChapters,
        addedAt: nowIso, lastCheckedAt: nowIso, discoveredVia: 'wattpad-search', searchKeyword: keyword,
      };
      await upsert(id, entry);
      entries.push(entry);
      watchingCount += 1;
      console.log(`+ [${result.completion}] "${result.title}" — đang theo dõi (registry/${id})`);
    }
    // A courtesy gap between Wattpad requests in the same batch.
    await new Promise(resolve => setTimeout(resolve, 1200));
  }

  console.log(`Tìm thấy ${results.length} kết quả cho "${keyword}" — ${fetchedCount} đã upload, ${watchingCount} đang theo dõi, bỏ qua (đã có) ${skipped}.`);
}

async function main(): Promise<void> {
  if (!OWNER_KEY) throw new Error('Thiếu biến môi trường OWNER_KEY.');
  switch (command) {
    case 'add': return cmdAdd(arg1);
    case 'sweep': return cmdSweep();
    case 'discover': return cmdDiscover(arg1);
    default:
      console.log('Cách dùng: tsx scripts/story-bot/index.ts <add|sweep|discover> [tham số] [--dry-run]');
      process.exitCode = 1;
  }
}

main().catch(error => {
  console.error(error instanceof Error ? error.message : error);
  process.exitCode = 1;
});
