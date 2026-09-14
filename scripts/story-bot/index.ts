import { WebsiteImporter } from '../../src/book-engine/website-importer/WebsiteImporter';
import { listRegistry, putRegistryEntry, BASE_URL, OWNER_KEY } from './registry-client';
import { findRegistryMatch, registryId } from './dedupe';
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
  const candidate = result.candidateBooks[0];
  if (!candidate) throw new Error('Không tìm thấy truyện nào tại URL này.');

  const existing = findRegistryMatch(entries, { sourceUrl: candidate.sourceUrl, title: candidate.title, author: candidate.author });
  if (existing) {
    console.log(`Đã có trong registry (status=${existing.status}): "${existing.title}" — bỏ qua để tránh trùng.`);
    return;
  }

  const platform = platformFor(candidate.adapterName);
  const completion = candidate.completion || 'unknown';
  const id = registryId(candidate.sourceUrl);

  if (completion === 'completed') {
    if (dryRun) {
      console.log(`[dry-run] "${candidate.title}" đã hoàn thành — sẽ tải ${candidate.totalChapters} chương, upload lên cloud và ghi registry/${id} (status=fetched).`);
      return;
    }
    console.log(`"${candidate.title}" đã hoàn thành — đang tải và upload.`);
    const { bookId, cloudId } = await fetchAndUploadCandidate(candidate, BASE_URL, OWNER_KEY);
    await upsert(id, {
      title: candidate.title, author: candidate.author, sourceUrl: candidate.sourceUrl,
      platform, status: 'fetched', completion, chapterCount: candidate.totalChapters,
      bookId: cloudId, addedAt: new Date().toISOString(),
    });
    console.log(`Đã upload: bookId=${bookId} cloudId=${cloudId}`);
  } else {
    await upsert(id, {
      title: candidate.title, author: candidate.author, sourceUrl: candidate.sourceUrl,
      platform, status: 'watching', completion, chapterCount: candidate.totalChapters,
      addedAt: new Date().toISOString(),
    });
    console.log(`Đã thêm vào danh sách theo dõi (completion=${completion}, ${candidate.totalChapters} chương). Sẽ chỉ tải khi hoàn thành.`);
  }
}

async function cmdSweep(): Promise<void> {
  const entries = await listRegistry();
  const watching = entries.filter(entry => entry.status === 'watching');
  console.log(`Đang theo dõi ${watching.length} nguồn.`);

  for (const entry of watching) {
    try {
      const result = await WebsiteImporter.analyze(entry.sourceUrl);
      const candidate = result.candidateBooks[0];
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

async function cmdApprove(id: string): Promise<void> {
  if (!id) throw new Error('Cần truyền id: tsx scripts/story-bot/index.ts approve <id>');
  const entries = await listRegistry();
  const entry = entries.find(item => item.id === id);
  if (!entry) throw new Error(`Không tìm thấy entry registry với id=${id}`);
  if (entry.status !== 'pending') {
    console.log(`Entry này không ở trạng thái chờ duyệt (đang là ${entry.status}).`);
    return;
  }

  if (entry.completion === 'completed') {
    if (dryRun) {
      console.log(`[dry-run] "${entry.title}" đã hoàn thành — sẽ tải và upload ngay khi duyệt.`);
      return;
    }
    const result = await WebsiteImporter.analyze(entry.sourceUrl);
    const candidate = result.candidateBooks[0];
    if (!candidate) throw new Error('Không phân tích lại được nguồn này.');
    const { bookId, cloudId } = await fetchAndUploadCandidate(candidate, BASE_URL, OWNER_KEY);
    await upsert(id, { ...entry, status: 'fetched', bookId: cloudId });
    console.log(`Đã duyệt và upload: bookId=${bookId} cloudId=${cloudId}`);
  } else {
    await upsert(id, { ...entry, status: 'watching' });
    console.log(`Đã duyệt, chuyển sang theo dõi (completion=${entry.completion}).`);
  }
}

async function cmdDiscover(keyword: string): Promise<void> {
  if (!keyword) throw new Error('Cần truyền từ khóa: tsx scripts/story-bot/index.ts discover <từ khóa>');

  const [entries, results] = await Promise.all([listRegistry(), searchWattpadStories(keyword)]);
  let added = 0;
  let skipped = 0;

  for (const result of results) {
    const existing = findRegistryMatch(entries, { sourceUrl: result.sourceUrl, title: result.title, author: result.author });
    if (existing) { skipped += 1; continue; }

    const id = registryId(result.sourceUrl);
    const nowIso = new Date().toISOString();
    const newEntry: RegistryEntry = {
      id, title: result.title, author: result.author, sourceUrl: result.sourceUrl,
      platform: 'wattpad', status: 'pending', completion: result.completion, chapterCount: result.totalChapters,
      addedAt: nowIso, lastCheckedAt: nowIso, discoveredVia: 'wattpad-search', searchKeyword: keyword,
    };
    await upsert(id, newEntry);
    entries.push(newEntry); // avoid re-adding a near-duplicate later in the same result page
    added += 1;
    console.log(`+ [${result.completion}] "${result.title}" (${result.totalChapters} chương, ${result.author}) — registry/${id}`);
  }

  console.log(`Tìm thấy ${results.length} kết quả cho "${keyword}" — thêm mới ${added} (status=pending, chờ duyệt), bỏ qua (đã có) ${skipped}.`);
}

async function main(): Promise<void> {
  if (!OWNER_KEY) throw new Error('Thiếu biến môi trường OWNER_KEY.');
  switch (command) {
    case 'add': return cmdAdd(arg1);
    case 'sweep': return cmdSweep();
    case 'approve': return cmdApprove(arg1);
    case 'discover': return cmdDiscover(arg1);
    default:
      console.log('Cách dùng: tsx scripts/story-bot/index.ts <add|sweep|approve|discover> [tham số] [--dry-run]');
      process.exitCode = 1;
  }
}

main().catch(error => {
  console.error(error instanceof Error ? error.message : error);
  process.exitCode = 1;
});
