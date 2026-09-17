import React, { useEffect, useState } from 'react';
import { ArrowLeft, FlaskConical, Info, LinkIcon } from 'lucide-react';
import { useApp } from '../context/AppContext';
import { JjwxcAccessManager } from '../book-engine/jjwxc-source/JjwxcAccessManager';
import { JjwxcNovelUrl, JjwxcUrlParser } from '../book-engine/jjwxc-source/JjwxcUrlParser';
import { JjwxcChapterExtractor, JjwxcChapterResult } from '../book-engine/jjwxc-source/JjwxcChapterExtractor';
import { JjwxcTocLoader, JjwxcTocResult } from '../book-engine/jjwxc-source/JjwxcTocLoader';
import { JJWXC_DEV_FIXTURES, TOC_OK_HTML } from '../book-engine/jjwxc-source/JjwxcDevFixtures';

/**
 * Owner-only trial page for the JJWXC personal-reading source. A JJWXC page can
 * only be read with the user's own already-logged-in browser session — same-origin
 * rules mean this website (my.lilyhub.top) cannot itself open a hidden window onto
 * wap.jjwxc.net and read its cookies/DOM. The actual mechanism for getting real
 * chapter text into Lily on the web (copy-paste, a bookmarklet, or something else)
 * is still being designed; this page currently only hosts the pure parsing logic
 * (JjwxcUrlParser/JjwxcTocLoader/JjwxcChapterExtractor) so it can be exercised and
 * verified ahead of that decision.
 */
export const JjwxcConnectPage: React.FC = () => {
  const { user, navigateTo } = useApp();

  const [testUrl, setTestUrl] = useState('https://wap.jjwxc.net/book2/9209789');
  const [testResult, setTestResult] = useState<{ input: string; parsed: JjwxcNovelUrl | null } | null>(null);

  const [fixtureId, setFixtureId] = useState(JJWXC_DEV_FIXTURES[0].id);
  const [fixtureHtml, setFixtureHtml] = useState(JJWXC_DEV_FIXTURES[0].html);
  const [extractResult, setExtractResult] = useState<JjwxcChapterResult | null>(null);
  const [tocResult, setTocResult] = useState<JjwxcTocResult | null>(null);

  const enabled = JjwxcAccessManager.isJjwxcConnectEnabled(user.isOwner);

  useEffect(() => {
    if (!enabled) navigateTo('settings');
  }, [enabled, navigateTo]);

  if (!enabled) return null;

  return (
    <div className="mx-auto max-w-2xl space-y-6">
      <button type="button" onClick={() => navigateTo('settings')} className="inline-flex items-center gap-2 text-xs font-semibold text-ink-600 hover:text-ink-950">
        <ArrowLeft className="h-4 w-4" /> Quay lại Cài đặt
      </button>

      <div className="rounded-3xl border border-ink-200 bg-white p-6 sm:p-8">
        <div className="flex items-start gap-3">
          <span className="flex h-11 w-11 shrink-0 items-center justify-center rounded-full bg-lily-50 text-lily-700"><LinkIcon className="h-5 w-5" /></span>
          <div>
            <h1 className="font-serif text-lg font-bold text-ink-950">Kết nối JJWXC</h1>
            <p className="mt-1 text-xs leading-relaxed text-ink-500">Thử nghiệm — chỉ hiển thị cho owner.</p>
          </div>
        </div>

        <div className="mt-5 flex items-start gap-2 rounded-2xl border border-sky-200 bg-sky-50 p-3.5 text-xs text-sky-900">
          <Info className="h-4 w-4 shrink-0" />
          <p>Đang thiết kế lại cho web/PWA (chạy trên my.lilyhub.top, không phải app native). Một trang web bình thường không thể tự mở JJWXC và đọc cookie/DOM của trang đó — cần một cơ chế khác (ví dụ: bạn tự copy-paste nội dung, hoặc một bookmarklet chạy trong chính tab JJWXC đã đăng nhập). Chưa có nút "đăng nhập"/"nhập truyện" thật ở bước này — chỉ có 2 panel bên dưới để kiểm tra logic phân tích URL/HTML thuần, không gọi mạng, không đọc cookie.</p>
        </div>
      </div>

      <div className="rounded-3xl border border-ink-200 bg-white p-6 sm:p-8">
        <div className="flex items-start gap-3">
          <span className="flex h-11 w-11 shrink-0 items-center justify-center rounded-full bg-cream-100 text-ink-600"><FlaskConical className="h-5 w-5" /></span>
          <div>
            <h2 className="font-serif text-base font-bold text-ink-950">Test URL / novelId parser (chạy trong browser)</h2>
            <p className="mt-1 text-xs leading-relaxed text-ink-500">Chỉ chạy logic parse URL cục bộ trong trình duyệt — không gọi mạng, không đọc cookie.</p>
          </div>
        </div>
        <div className="mt-4 flex flex-col gap-2 sm:flex-row">
          <input
            value={testUrl}
            onChange={event => setTestUrl(event.target.value)}
            placeholder="https://wap.jjwxc.net/book2/9209789"
            className="min-w-0 flex-1 rounded-xl border border-ink-200 bg-cream-50 px-4 py-3 text-xs text-ink-900 outline-none focus:border-lily-400"
          />
          <button
            type="button"
            onClick={() => setTestResult({ input: testUrl, parsed: JjwxcUrlParser.parseNovelUrl(testUrl) })}
            className="inline-flex items-center justify-center gap-2 rounded-xl bg-ink-950 px-5 py-3 text-xs font-semibold text-white"
          >
            Phân tích URL
          </button>
        </div>
        {testResult && (
          <div className={`mt-4 rounded-2xl p-4 text-xs ${testResult.parsed ? 'bg-emerald-50 text-emerald-900' : 'bg-rose-50 text-rose-900'}`}>
            {testResult.parsed ? (
              <>
                <p><strong>novelId:</strong> {testResult.parsed.novelId}</p>
                <p><strong>hostname:</strong> {testResult.parsed.hostname}</p>
              </>
            ) : (
              <p>Không parse được — URL không đúng dạng https://wap.jjwxc.net/book2/&#123;novelId&#125; (bị từ chối có chủ đích nếu domain khác JJWXC, path khác /book2/&#123;số&#125;, hoặc không phải https).</p>
            )}
          </div>
        )}
      </div>

      <div className="rounded-3xl border border-ink-200 bg-white p-6 sm:p-8">
        <div className="flex items-start gap-3">
          <span className="flex h-11 w-11 shrink-0 items-center justify-center rounded-full bg-cream-100 text-ink-600"><FlaskConical className="h-5 w-5" /></span>
          <div>
            <h2 className="font-serif text-base font-bold text-ink-950">Test parser/extractor với fixture HTML (chạy trong browser)</h2>
            <p className="mt-1 text-xs leading-relaxed text-ink-500">Chỉ chạy <code className="rounded bg-cream-100 px-1">JjwxcChapterExtractor</code>/<code className="rounded bg-cream-100 px-1">JjwxcTocLoader</code> trên chuỗi HTML mẫu tự viết (không lấy từ JJWXC thật) — không gọi mạng, không đọc cookie/session thật.</p>
          </div>
        </div>

        <div className="mt-4">
          <label className="text-xs font-semibold text-ink-700">Chọn fixture 4 trạng thái</label>
          <select
            value={fixtureId}
            onChange={event => {
              const fixture = JJWXC_DEV_FIXTURES.find(item => item.id === event.target.value) || JJWXC_DEV_FIXTURES[0];
              setFixtureId(fixture.id);
              setFixtureHtml(fixture.html);
              setExtractResult(null);
              setTocResult(null);
            }}
            className="mt-1 w-full rounded-xl border border-ink-200 bg-cream-50 px-4 py-3 text-xs text-ink-900 outline-none focus:border-lily-400"
          >
            {JJWXC_DEV_FIXTURES.map(fixture => <option key={fixture.id} value={fixture.id}>{fixture.label}</option>)}
          </select>
        </div>

        <textarea
          value={fixtureHtml}
          onChange={event => setFixtureHtml(event.target.value)}
          rows={6}
          className="mt-3 w-full rounded-xl border border-ink-200 bg-cream-50 px-4 py-3 font-mono text-[11px] text-ink-800 outline-none focus:border-lily-400"
        />

        <div className="mt-3 flex flex-col gap-2 sm:flex-row">
          <button
            type="button"
            onClick={() => setExtractResult(JjwxcChapterExtractor.extract(fixtureHtml))}
            className="inline-flex flex-1 items-center justify-center gap-2 rounded-xl bg-ink-950 px-4 py-2.5 text-xs font-semibold text-white"
          >
            Chạy JjwxcChapterExtractor
          </button>
          <button
            type="button"
            onClick={() => { setFixtureHtml(TOC_OK_HTML); setTocResult(JjwxcTocLoader.parse(TOC_OK_HTML)); }}
            className="inline-flex flex-1 items-center justify-center gap-2 rounded-xl border border-ink-200 bg-white px-4 py-2.5 text-xs font-semibold text-ink-700"
          >
            Nạp fixture TOC mẫu &amp; chạy JjwxcTocLoader
          </button>
        </div>

        {extractResult && (
          <div className="mt-4 rounded-2xl bg-cream-50 p-4 text-xs text-ink-700">
            <p><strong>status:</strong> {extractResult.status}</p>
            <p><strong>title:</strong> {extractResult.title ?? '(null)'}</p>
            <p className="mt-1"><strong>paragraphs ({extractResult.paragraphs.length}):</strong></p>
            <ul className="mt-1 list-disc space-y-1 pl-4">
              {extractResult.paragraphs.map((paragraph, index) => <li key={index}>{paragraph}</li>)}
            </ul>
          </div>
        )}

        {tocResult && (
          <div className="mt-4 rounded-2xl bg-cream-50 p-4 text-xs text-ink-700">
            <p><strong>status:</strong> {tocResult.status}</p>
            <p><strong>title:</strong> {tocResult.title ?? '(null)'}</p>
            <p><strong>author:</strong> {tocResult.author ?? '(null)'}</p>
            <p className="mt-1"><strong>chapters ({tocResult.chapters.length}):</strong></p>
            <ul className="mt-1 list-disc space-y-1 pl-4">
              {tocResult.chapters.map(chapter => <li key={chapter.index}>{chapter.index}. {chapter.title} — {chapter.url}</li>)}
            </ul>
          </div>
        )}
      </div>
    </div>
  );
};
