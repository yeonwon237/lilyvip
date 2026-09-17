import React, { useEffect, useState } from 'react';
import { ArrowLeft, BookPlus, FlaskConical, LinkIcon, LogOut, ShieldAlert, Smartphone } from 'lucide-react';
import { useApp, DuplicateBookError } from '../context/AppContext';
import { JjwxcAccessManager } from '../book-engine/jjwxc-source/JjwxcAccessManager';
import { JjwxcSession } from '../book-engine/jjwxc-source/JjwxcSession';
import { JjwxcWebViewService } from '../book-engine/jjwxc-source/JjwxcWebViewService';
import { JjwxcNovelUrl, JjwxcUrlParser } from '../book-engine/jjwxc-source/JjwxcUrlParser';
import { JjwxcChapterExtractor, JjwxcChapterResult } from '../book-engine/jjwxc-source/JjwxcChapterExtractor';
import { JjwxcTocLoader, JjwxcTocResult } from '../book-engine/jjwxc-source/JjwxcTocLoader';
import { JJWXC_DEV_FIXTURES, TOC_OK_HTML } from '../book-engine/jjwxc-source/JjwxcDevFixtures';
import { JjwxcSourceAdapter } from '../book-engine/jjwxc-source/JjwxcSourceAdapter';

const IMPORT_STATUS_MESSAGE: Record<string, string> = {
  invalid_url: 'URL không đúng dạng https://wap.jjwxc.net/book2/{novelId}.',
  locked: 'Không lấy được danh sách chương — trang yêu cầu mua truyện trước khi xem mục lục.',
  session_expired: 'Phiên đăng nhập JJWXC đã hết hạn. Hãy đăng nhập lại ở trên rồi thử nhập lại.',
  unknown_format: 'Lily không nhận diện được trang này (có thể JJWXC đã đổi giao diện). Không đoán bừa.',
  navigation_error: 'Không tải được trang truyện — kiểm tra lại URL hoặc kết nối mạng.',
  timeout: 'Tải trang truyện quá lâu, đã huỷ.',
};

/**
 * Phase 1 only: opens JJWXC's own login page inside an isolated, plugin-owned
 * WebView so the owner can sign in with their own account. Lily never sees the
 * form, never reads cookies, and never sends anything JJWXC-related to a Lily
 * server. TOC loading, chapter extraction, and translation come in later phases.
 *
 * This page checks access itself (not just SettingsPage hiding the entry point),
 * and every native call still goes through JjwxcWebViewService, which re-checks
 * access again — so this page's own check is a UX nicety, not the real gate.
 */
export const JjwxcConnectPage: React.FC = () => {
  const { user, navigateTo, showToast, addParsedBook } = useApp();
  const [markedConnectedAt, setMarkedConnectedAt] = useState<number | null>(() => JjwxcSession.getMarkedConnectedAt());
  const [busy, setBusy] = useState<'open' | 'disconnect' | 'import' | null>(null);

  const [importUrl, setImportUrl] = useState('');

  const [testUrl, setTestUrl] = useState('https://wap.jjwxc.net/book2/9209789');
  const [testResult, setTestResult] = useState<{ input: string; parsed: JjwxcNovelUrl | null } | null>(null);

  const [fixtureId, setFixtureId] = useState(JJWXC_DEV_FIXTURES[0].id);
  const [fixtureHtml, setFixtureHtml] = useState(JJWXC_DEV_FIXTURES[0].html);
  const [extractResult, setExtractResult] = useState<JjwxcChapterResult | null>(null);
  const [tocResult, setTocResult] = useState<JjwxcTocResult | null>(null);

  const enabled = JjwxcAccessManager.isJjwxcConnectEnabled(user.isOwner);
  const isNative = JjwxcAccessManager.isNativeRuntimeAvailable();

  useEffect(() => {
    if (!enabled) navigateTo('settings');
  }, [enabled, navigateTo]);

  if (!enabled) return null;

  const openLogin = async () => {
    setBusy('open');
    try {
      await JjwxcWebViewService.openLogin(user.isOwner, () => {
        setMarkedConnectedAt(JjwxcSession.getMarkedConnectedAt());
      });
    } catch {
      showToast(isNative ? 'Không mở được WebView JJWXC trên thiết bị này.' : 'Kết nối JJWXC chỉ khả dụng trong app di động, không chạy trên bản web.', 'error');
    } finally {
      setBusy(null);
    }
  };

  const importNovel = async () => {
    setBusy('import');
    try {
      const result = await JjwxcSourceAdapter.buildDraftFromUrl(importUrl, user.isOwner);
      if (result.status !== 'ok' || !result.draft) {
        showToast(IMPORT_STATUS_MESSAGE[result.status] || 'Không nhập được truyện.', 'error');
        return;
      }
      const sourceMeta = JjwxcSourceAdapter.buildSourceMeta(
        importUrl,
        JjwxcUrlParser.parseNovelUrl(importUrl)?.hostname || 'wap.jjwxc.net',
        result.novelId || ''
      );
      const saved = await addParsedBook(result.draft, { source: sourceMeta });
      showToast(`Đã thêm "${saved.title}" — nội dung từng chương sẽ tải khi bạn mở đọc.`, 'success');
      setImportUrl('');
    } catch (error) {
      if (error instanceof DuplicateBookError) {
        showToast('Truyện này đã có trong thư viện.', 'info');
        return;
      }
      showToast(error instanceof Error ? error.message : 'Không nhập được truyện từ JJWXC.', 'error');
    } finally {
      setBusy(null);
    }
  };

  const disconnect = async () => {
    setBusy('disconnect');
    try {
      await JjwxcWebViewService.disconnect(user.isOwner);
      setMarkedConnectedAt(null);
      showToast('Đã xoá phiên đăng nhập JJWXC khỏi thiết bị.', 'success');
    } catch {
      showToast(isNative ? 'Không xoá được dữ liệu WebView.' : 'Kết nối JJWXC chỉ khả dụng trong app di động, không chạy trên bản web.', 'error');
    } finally {
      setBusy(null);
    }
  };

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
            <p className="mt-1 text-xs leading-relaxed text-ink-500">Thử nghiệm — chỉ hiển thị cho owner. Lily mở trang đăng nhập chính thức của JJWXC trong một WebView riêng; bạn tự đăng nhập, Lily không nhìn thấy mật khẩu và không đọc cookie/session của bạn.</p>
          </div>
        </div>

        {!isNative && (
          <div className="mt-5 flex items-start gap-2 rounded-2xl border border-amber-200 bg-amber-50 p-3.5 text-xs text-amber-900">
            <ShieldAlert className="h-4 w-4 shrink-0" />
            <div className="space-y-1">
              <p className="font-mono font-bold">Native mobile app required for JJWXC login/session</p>
              <p>Tính năng này chỉ khả dụng trong app iOS/Android (build qua Capacitor) — đang chạy ở bản web/PWA thông thường nên nút bên dưới bị khoá và Lily sẽ không thử gọi WebView native, không mock đăng nhập thành công, không giả cookie/session, không mở JJWXC bằng iframe.</p>
            </div>
          </div>
        )}

        <div className="mt-5 rounded-2xl bg-cream-50 p-4 text-xs text-ink-600">
          <p><strong className="text-ink-800">Trạng thái:</strong> {markedConnectedAt ? `Đã đóng WebView lúc ${new Date(markedConnectedAt).toLocaleString('vi-VN')} — chưa xác minh đã đăng nhập thành công (việc đó thuộc phase sau).` : 'Chưa mở WebView JJWXC lần nào trên thiết bị này.'}</p>
          <p className="mt-2"><strong className="text-ink-800">UNVERIFIED:</strong> khả năng WebView native giữ session qua việc đóng/mở lại app chưa được xác nhận trên thiết bị thật — chỉ coi là đã xác minh sau khi test theo hướng dẫn Bước 3-4 (kill app, mở lại, kiểm tra còn đăng nhập) thành công trên iPhone/Android thật.</p>
        </div>

        <div className="mt-5 flex flex-col gap-2 sm:flex-row">
          <button
            type="button"
            onClick={() => void openLogin()}
            disabled={busy !== null || !isNative}
            className="inline-flex flex-1 items-center justify-center gap-2 rounded-xl bg-ink-950 px-5 py-3 text-sm font-semibold text-white disabled:opacity-40"
          >
            <Smartphone className="h-4 w-4" /> Mở JJWXC để đăng nhập
          </button>
          <button
            type="button"
            onClick={() => void disconnect()}
            disabled={busy !== null || !isNative}
            className="inline-flex items-center justify-center gap-2 rounded-xl border border-ink-200 bg-white px-5 py-3 text-sm font-semibold text-ink-700 disabled:opacity-40"
          >
            <LogOut className="h-4 w-4" /> Ngắt kết nối
          </button>
        </div>
      </div>

      <div className="rounded-3xl border border-ink-200 bg-white p-6 sm:p-8">
        <div className="flex items-start gap-3">
          <span className="flex h-11 w-11 shrink-0 items-center justify-center rounded-full bg-lily-50 text-lily-700"><BookPlus className="h-5 w-5" /></span>
          <div>
            <h2 className="font-serif text-base font-bold text-ink-950">Nhập truyện vào thư viện</h2>
            <p className="mt-1 text-xs leading-relaxed text-ink-500">Chỉ tải tiêu đề, tác giả và danh sách chương (mục lục) — <strong>không</strong> tải trước nội dung. Từng chương sẽ được lấy qua WebView đã đăng nhập ngay khi bạn mở đọc trong Reader.</p>
          </div>
        </div>
        <div className="mt-4 flex flex-col gap-2 sm:flex-row">
          <input
            value={importUrl}
            onChange={event => setImportUrl(event.target.value)}
            placeholder="https://wap.jjwxc.net/book2/9209789"
            className="min-w-0 flex-1 rounded-xl border border-ink-200 bg-cream-50 px-4 py-3 text-xs text-ink-900 outline-none focus:border-lily-400"
          />
          <button
            type="button"
            onClick={() => void importNovel()}
            disabled={busy !== null || !isNative || !importUrl.trim()}
            className="inline-flex items-center justify-center gap-2 rounded-xl bg-ink-950 px-5 py-3 text-xs font-semibold text-white disabled:opacity-40"
          >
            <BookPlus className="h-4 w-4" /> Nhập truyện
          </button>
        </div>
        {!isNative && <p className="mt-2 text-[11px] text-amber-700">Native mobile app required for JJWXC login/session.</p>}
      </div>

      <div className="rounded-3xl border border-ink-200 bg-white p-6 sm:p-8">
        <div className="flex items-start gap-3">
          <span className="flex h-11 w-11 shrink-0 items-center justify-center rounded-full bg-cream-100 text-ink-600"><FlaskConical className="h-5 w-5" /></span>
          <div>
            <h2 className="font-serif text-base font-bold text-ink-950">Test URL / novelId parser (chạy trong browser)</h2>
            <p className="mt-1 text-xs leading-relaxed text-ink-500">Chỉ chạy logic parse URL cục bộ trong trình duyệt — không gọi mạng, không mở WebView, không đọc cookie. Dùng để kiểm tra route protection và trạng thái UI trên localhost trong khi chưa build được app native.</p>
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
            <p className="mt-1 text-xs leading-relaxed text-ink-500">Chỉ chạy <code className="rounded bg-cream-100 px-1">JjwxcChapterExtractor</code>/<code className="rounded bg-cream-100 px-1">JjwxcTocLoader</code> trên chuỗi HTML mẫu tự viết (không lấy từ JJWXC thật) — không mở WebView, không đọc cookie/session thật. Dùng để kiểm tra logic phân loại trạng thái mà không cần giả lập đăng nhập.</p>
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
