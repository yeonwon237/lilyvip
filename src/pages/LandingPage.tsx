import React, { useEffect, useState } from 'react';
import { ArrowRight, BookOpen, Bookmark, Check, ChevronLeft, ChevronRight, Cloud, FileText, Globe2, Headphones, Library, MessageCircle, Palette, Play, ShieldCheck, Sparkles, Upload, WifiOff, X } from 'lucide-react';
import { useApp } from '../context/AppContext';
import { PRODUCT_PLANS } from '../config/plans';
import { openTelegramPurchase } from '../utils/telegram';
import { Brand } from '../components/common/Brand';

type DemoScene = 'import' | 'preview' | 'reader' | 'voices' | 'library' | 'themes' | 'shelves' | 'backup' | 'cloud';
type DemoSlide = { scene: DemoScene; eyebrow: string; title: string; description: string };

const PRODUCT_DEMO: DemoSlide[] = [
  { scene: 'import', eyebrow: 'Bước 1 · Đưa truyện vào Lily', title: 'Chọn nguồn bạn đang có', description: 'Lấy truyện từ LilyHub, chọn file TXT/EPUB/DOCX hoặc dán liên kết website công khai được hỗ trợ.' },
  { scene: 'preview', eyebrow: 'Bước 2 · Lily chuẩn bị thư viện', title: 'Kiểm tra rồi mới lưu', description: 'Xem lại tên truyện, tác giả, số chương và khoảng chương cần nhập trước khi đưa vào thiết bị.' },
  { scene: 'reader', eyebrow: 'Bước 3 · Bắt đầu đọc', title: 'Một không gian đọc của riêng bạn', description: 'Lily lưu tiến độ, cho phép đổi chữ, đổi nền, đánh dấu và ghi chú mà không phụ thuộc giao diện website nguồn.' },
  { scene: 'voices', eyebrow: 'Bước 4 · Đọc hoặc nghe ngoại tuyến', title: 'Rời website, câu chuyện vẫn tiếp tục', description: 'Tải giọng Lily về thiết bị để nghe truyện đã lưu ngay cả khi mạng yếu hoặc không có kết nối.' },
];

const COMPARISON_ROWS = [
  { label: 'Nhiều nguồn trong một thư viện', website: 'Thường bị tách theo từng website', fileApp: 'Chủ yếu là file trên máy', lily: 'LilyHub, file và website hỗ trợ' },
  { label: 'Đọc khi không có mạng', website: 'Phụ thuộc website và kết nối', fileApp: 'Có với file đã tải', lily: 'Có với truyện đã lưu' },
  { label: 'Không gian đọc nhất quán', website: 'Giao diện, quảng cáo tùy nguồn', fileApp: 'Có', lily: 'Có, tối ưu riêng cho truyện dài' },
  { label: 'Nghe truyện', website: 'Tùy từng nguồn', fileApp: 'Tùy ứng dụng', lily: 'Giọng Lily và giọng trên thiết bị' },
  { label: 'Tiến độ, ghi chú và tủ sách', website: 'Nằm rời rạc theo nguồn', fileApp: 'Tùy ứng dụng', lily: 'Gom chung trong thư viện cá nhân' },
  { label: 'Chuyển thư viện khi đổi máy', website: 'Theo tài khoản của từng nguồn', fileApp: 'Tự quản lý file', lily: 'File sao lưu với MY30 và MY100' },
];

const PRODUCT_STEP_LABELS = ['Thêm truyện', 'Kiểm tra', 'Đọc', 'Nghe'];

const PLAN_DEMOS: Record<string, DemoSlide[]> = {
  'MIỄN PHÍ': [
    { scene: 'import', eyebrow: '3 nguồn truyện', title: 'Lấy truyện theo cách bạn có', description: 'Chọn từ LilyHub, nhập file TXT/EPUB/DOCX hoặc dán liên kết website được hỗ trợ.' },
    { scene: 'reader', eyebrow: 'Đọc ngoại tuyến', title: 'Đọc theo cách của bạn', description: 'Đổi cỡ chữ, đánh dấu và ghi chú ngay trên thiết bị.' },
    { scene: 'voices', eyebrow: 'Nghe truyện', title: 'Lily Thảo và giọng máy', description: 'Chọn Lily Thảo để tải về nghe offline hoặc dùng giọng có sẵn trên thiết bị.' },
  ],
  MY30: [
    { scene: 'import', eyebrow: '3 nguồn truyện', title: 'Lấy truyện theo cách bạn có', description: 'Chọn từ LilyHub, nhập file TXT/EPUB/DOCX hoặc dán liên kết website được hỗ trợ.' },
    { scene: 'library', eyebrow: 'Thư viện MY30', title: 'Lưu tối đa 30 truyện', description: 'Gom truyện LilyHub, file và website vào cùng một thư viện.' },
    { scene: 'backup', eyebrow: 'File sao lưu thủ công', title: 'Bạn tự giữ và chuyển file', description: 'Tải file chứa truyện cá nhân, tủ sách, tiến độ, đánh dấu và ghi chú; khi đổi máy, chọn file để khôi phục.' },
    { scene: 'voices', eyebrow: 'Giọng Lily', title: 'Mở toàn bộ giọng đọc', description: 'Tải giọng yêu thích và nghe truyện ngay cả khi không có mạng.' },
    { scene: 'themes', eyebrow: 'Không gian đọc', title: 'Mở toàn bộ giao diện', description: 'Dùng chủ đề cao cấp, kiểu chữ nâng cao, tự cuộn và chế độ tập trung.' },
    { scene: 'shelves', eyebrow: 'Tủ sách', title: 'Tự xếp truyện theo ý bạn', description: 'Theo dõi truyện đang đọc, yêu thích, đã hoàn thành hoặc tạo bộ sưu tập riêng.' },
  ],
  MY100: [
    { scene: 'import', eyebrow: '3 nguồn truyện', title: 'Lấy truyện theo cách bạn có', description: 'Chọn từ LilyHub, nhập file TXT/EPUB/DOCX hoặc dán liên kết website được hỗ trợ.' },
    { scene: 'library', eyebrow: 'Thư viện MY100', title: 'Lưu tối đa 100 truyện', description: 'Phù hợp với người đọc nhiều và muốn giữ một thư viện lớn trên máy.' },
    { scene: 'backup', eyebrow: 'File sao lưu thủ công', title: 'Bạn tự giữ và chuyển file', description: 'Tải file chứa truyện cá nhân, tủ sách, tiến độ, đánh dấu và ghi chú; khi đổi máy, chọn file để khôi phục.' },
    { scene: 'voices', eyebrow: 'Giọng Lily', title: 'Mở toàn bộ giọng đọc', description: 'Tải giọng yêu thích và nghe truyện ngay cả khi không có mạng.' },
    { scene: 'themes', eyebrow: 'Không gian đọc', title: 'Mở toàn bộ giao diện', description: 'Dùng chủ đề cao cấp, kiểu chữ nâng cao, tự cuộn và chế độ tập trung.' },
    { scene: 'shelves', eyebrow: 'Tủ sách', title: 'Tự xếp truyện theo ý bạn', description: 'Theo dõi truyện đang đọc, yêu thích, đã hoàn thành hoặc tạo bộ sưu tập riêng.' },
  ],
  'MY CLOUD': [
    { scene: 'import', eyebrow: '3 nguồn truyện', title: 'Lấy truyện theo cách bạn có', description: 'Chọn từ LilyHub, nhập file TXT/EPUB/DOCX hoặc dán liên kết website được hỗ trợ.' },
    { scene: 'library', eyebrow: 'Trên thiết bị', title: 'Không giới hạn số truyện', description: 'Lưu thư viện lớn trực tiếp trên thiết bị của bạn.' },
    { scene: 'cloud', eyebrow: 'Tự động qua tài khoản', title: 'Đăng nhập là thấy thư viện', description: 'Cloud tự đồng bộ thư viện và tiến độ giữa các thiết bị, không cần tải hay chuyển file thủ công.' },
  ],
};

export const LandingPage: React.FC = () => {
  const { navigateTo, openUpgradeModal } = useApp();
  const [demoPlanName, setDemoPlanName] = useState<string | null>(null);
  const [demoSlideIndex, setDemoSlideIndex] = useState(0);
  const [isProductDemo, setIsProductDemo] = useState(false);
  const demoSlides = isProductDemo ? PRODUCT_DEMO : demoPlanName ? PLAN_DEMOS[demoPlanName] : null;
  const demoSlide = demoSlides?.[demoSlideIndex];
  const buyOnTelegram = (tier?: string) => {
    if (tier !== 'vip1' && tier !== 'vip2') return openUpgradeModal('Chọn gói Lily Reader');
    openTelegramPurchase(tier);
  };
  const openDemo = () => {
    setDemoSlideIndex(0);
    setDemoPlanName('LILY READER');
    setIsProductDemo(true);
  };
  const openPlanDemo = (planName: string) => {
    setDemoSlideIndex(0);
    setIsProductDemo(false);
    setDemoPlanName(planName);
  };
  const availablePlans = PRODUCT_PLANS.filter(plan => !plan.pending);
  const isLastDemoSlide = !!demoSlides && demoSlideIndex === demoSlides.length - 1;
  const demoCtaLabel = isProductDemo ? 'Tự thêm truyện đầu tiên' : demoPlanName === 'MIỄN PHÍ' ? 'Dùng thử ngay' : `Chọn ${demoPlanName}`;
  const closeDemo = () => setDemoPlanName(null);
  const finishDemo = () => {
    closeDemo();
    if (isProductDemo || demoPlanName === 'MIỄN PHÍ') navigateTo('dashboard');
    else buyOnTelegram(demoPlanName === 'MY30' ? 'vip1' : 'vip2');
  };
  useEffect(() => {
    if (!demoSlides) return;
    const onKey = (event: KeyboardEvent) => {
      if (event.key === 'Escape') setDemoPlanName(null);
      if (event.key === 'ArrowRight') setDemoSlideIndex(index => Math.min(demoSlides.length - 1, index + 1));
      if (event.key === 'ArrowLeft') setDemoSlideIndex(index => Math.max(0, index - 1));
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [demoSlides]);
  return (
    <div className="landing-page min-h-screen bg-[#FAF8F5] text-ink-900">
      <header className="sticky top-0 z-40 border-b border-ink-100 bg-[#FAF8F5]/90 px-5 py-4 backdrop-blur-md sm:px-8">
        <div className="mx-auto flex max-w-6xl items-center justify-between gap-4">
          <button type="button" onClick={() => navigateTo('landing')} aria-label="Trang giới thiệu Lily Reader" className="shrink-0"><Brand iconClassName="h-8 w-8" textClassName="text-lg" /></button>
          <nav className="hidden items-center gap-7 text-xs text-ink-600 md:flex"><a href="#cach-dung">Khám phá</a><a href="#bang-gia">Gói thành viên</a><a href="https://t.me/+Y8M62X2kWBIxODg9" target="_blank" rel="noreferrer">Cộng đồng Lily</a><button type="button" onClick={() => navigateTo('legal')}>Quyền riêng tư</button></nav>
          <div className="flex items-center gap-2"><button type="button" onClick={() => navigateTo('login')} className="rounded-xl px-3 py-2 text-xs font-semibold hover:bg-white">Đăng nhập</button><button type="button" onClick={() => navigateTo('dashboard')} className="rounded-xl bg-ink-950 px-4 py-2.5 text-xs font-semibold text-white shadow-soft">Mở thư viện</button></div>
        </div>
      </header>

      <main>
        <section className="mx-auto max-w-5xl px-4 pb-10 pt-8 text-center sm:px-8 sm:pb-16 sm:pt-14">
          <div className="inline-flex items-center gap-1.5 rounded-full border border-lily-200 bg-lily-50 px-3 py-1.5 text-[11px] font-medium text-lily-900 sm:gap-2 sm:px-3.5 sm:text-xs"><BookOpen className="h-3.5 w-3.5" />Lily Reader by LilyHub</div>
          <h1 className="mx-auto mt-4 max-w-4xl font-serif text-[1.625rem] font-bold leading-[1.15] text-ink-950 [text-wrap:balance] sm:mt-5 sm:text-5xl">Biến truyện từ website và file thành <span className="whitespace-nowrap">thư viện</span> <span className="whitespace-nowrap">của riêng bạn.</span></h1>
          <p className="mx-auto mt-3 max-w-[21rem] text-[13px] leading-[1.65] text-ink-500 [text-wrap:pretty] sm:mt-4 sm:max-w-xl sm:text-[15px]">Nhập truyện từ LilyHub, <span className="whitespace-nowrap">TXT, EPUB, DOCX</span> hoặc website được hỗ trợ. Lily tự sắp xếp chương để bạn đọc, nghe và lưu tiến độ ngay cả khi không có mạng.</p>
          <div className="mx-auto mt-5 grid max-w-sm grid-cols-2 gap-2.5 sm:mt-6"><button type="button" onClick={() => navigateTo('dashboard')} className="inline-flex h-10 items-center justify-center gap-1.5 whitespace-nowrap rounded-xl bg-ink-950 px-2 text-[13px] font-semibold text-white">Đọc thử ngay <ArrowRight className="h-3.5 w-3.5" /></button><button type="button" onClick={openDemo} className="inline-flex h-10 items-center justify-center gap-1.5 whitespace-nowrap rounded-xl border border-ink-200 bg-white px-2 text-[13px] font-semibold text-ink-900"><Play className="h-3.5 w-3.5" /> Xem Lily hoạt động</button></div>
          <div className="mx-auto mt-4 flex max-w-2xl flex-wrap justify-center gap-x-4 gap-y-1.5 text-[11px] text-ink-500 sm:text-xs"><span>✓ Không cần đăng nhập</span><span>✓ Không cần cài ứng dụng</span><span>✓ Truyện lưu trên thiết bị</span><span>✓ Miễn phí tối đa 10 truyện</span></div>

          <div className="mx-auto mt-8 max-w-3xl rounded-3xl border border-ink-200/80 bg-white p-4 text-left shadow-float sm:mt-12 sm:p-6">
            <div className="flex items-center justify-between border-b border-ink-100 pb-4"><div><p className="font-serif text-base font-bold text-ink-950">Thêm truyện vào Lily</p><p className="mt-1 text-xs text-ink-500">Chọn cách bạn đang có truyện</p></div><span className="rounded-full bg-emerald-50 px-2.5 py-1 text-[10px] font-semibold text-emerald-700">Lưu trên thiết bị</span></div>
            <div className="grid gap-2.5 py-5 sm:grid-cols-3 sm:gap-3 sm:py-6"><SourcePreview icon={<Library />} title="LilyHub" text="Chọn từ thư viện" /><SourcePreview icon={<BookOpen />} title="Từ thiết bị" text="TXT, EPUB, DOCX" /><SourcePreview icon={<ArrowRight />} title="Từ website" text="Dán liên kết công khai" /></div>
            <div className="flex flex-wrap gap-x-6 gap-y-2 border-t border-ink-100 pt-4 text-xs text-ink-500"><span>✓ Chọn khoảng chương cần nhập</span><span>✓ Sắp xếp chương</span><span>✓ Báo chương thiếu</span></div>
          </div>
        </section>

        <section id="cach-dung" className="border-y border-ink-100 bg-white/60 px-5 py-10 sm:px-8 sm:py-14">
          <div className="mx-auto max-w-6xl">
            <p className="text-[11px] font-semibold uppercase tracking-[0.14em] text-ink-500">Từ nguồn truyện đến giờ đọc</p><h2 className="mt-3 max-w-2xl font-serif text-2xl font-bold text-ink-950 sm:text-[1.75rem]">Bớt thời gian xử lý file. Dành thời gian cho câu chuyện.</h2>
            <div className="mt-7 grid gap-3 md:grid-cols-3 md:gap-4">
              <Feature icon={<Library />} title="Không còn thất lạc truyện">Gom truyện từ nhiều nguồn vào một thư viện, có bìa, tiến độ và tủ sách riêng.</Feature>
              <Feature icon={<BookOpen />} title="Đọc theo cách dễ chịu hơn">Chỉnh chữ, màu nền, độ rộng; tự cuộn, đánh dấu và ghi chú ngay trong lúc đọc.</Feature>
              <Feature icon={<Headphones />} title="Nghe ngay cả khi mất mạng">Tải giọng Lily về thiết bị và tiếp tục nghe khi không có kết nối mạng.</Feature>
            </div>
            <div className="mt-7 grid gap-3 border-t border-ink-100 pt-6 sm:grid-cols-3">
              <Step icon={<Upload />} number="01" title="Chọn nguồn">LilyHub, file trên máy hoặc liên kết công khai.</Step>
              <Step icon={<ShieldCheck />} number="02" title="Kiểm tra trước">Xem tên, tác giả, số chương và cảnh báo trước khi lưu.</Step>
              <Step icon={<WifiOff />} number="03" title="Đọc hoặc nghe">Mở truyện ngay và tiếp tục khi không có mạng.</Step>
            </div>
          </div>
        </section>

        <section className="mx-auto max-w-6xl px-5 py-10 sm:px-8 sm:py-14">
          <div className="grid gap-8 lg:grid-cols-[0.9fr_1.1fr] lg:items-center">
            <div><p className="text-[11px] font-semibold uppercase tracking-[0.14em] text-ink-500">Nguồn được hỗ trợ</p><h2 className="mt-3 font-serif text-2xl font-bold text-ink-950 sm:text-[1.75rem]">Bắt đầu từ nơi bạn đang có truyện.</h2><p className="mt-4 max-w-lg text-[13px] leading-6 text-ink-600">Lily chỉ nhập nội dung mà bạn có quyền truy cập. Website cần có liên kết công khai và cấu trúc Lily nhận diện được.</p></div>
            <div className="grid gap-3 sm:grid-cols-2">
              <SourceDetail icon={<Library />} title="LilyHub">Chọn truyện và khoảng chương cần đưa vào thư viện cá nhân.</SourceDetail>
              <SourceDetail icon={<FileText />} title="File trên thiết bị">Hỗ trợ TXT, EPUB và DOCX; xử lý trực tiếp trong trình duyệt.</SourceDetail>
              <SourceDetail icon={<Globe2 />} title="Website công khai">Dán liên kết từ website tương thích. Lily kiểm tra nội dung và cấu trúc chương trước khi cho phép lưu.</SourceDetail>
              <SourceDetail icon={<ShieldCheck />} title="Không vượt bảo vệ truy cập">Không nhập trang cần đăng nhập, CAPTCHA, paywall hoặc nội dung riêng tư.</SourceDetail>
            </div>
          </div>
        </section>

        <section className="border-y border-ink-100 bg-[#F3EFE8] px-5 py-10 sm:px-8 sm:py-14">
          <div className="mx-auto max-w-6xl">
            <div className="grid gap-5 lg:grid-cols-[1fr_0.8fr] lg:items-end"><div><p className="text-[11px] font-semibold uppercase tracking-[0.14em] text-ink-500">Vì sao là Lily Reader?</p><h2 className="mt-3 max-w-3xl font-serif text-2xl font-bold text-ink-950 sm:text-[1.75rem]">Website là nơi tìm truyện. Lily là nơi bạn thật sự đọc truyện.</h2></div><p className="text-[13px] leading-6 text-ink-600">Lily không thay thế nguồn truyện. Lily giúp bạn mang những truyện được phép truy cập về một không gian đọc nhất quán, riêng tư và dùng được khi mất mạng.</p></div>

            <ul className="mt-6 divide-y divide-ink-100 rounded-2xl border border-ink-200 bg-white px-4 md:hidden">{COMPARISON_ROWS.map(row => <ComparisonItem key={row.label} {...row} />)}</ul>
            <div className="mt-6 hidden overflow-hidden rounded-2xl border border-ink-200 bg-white shadow-soft md:block">
              <table className="w-full border-collapse text-left text-xs">
                <thead><tr className="border-b border-ink-200 bg-white"><th className="p-4 font-semibold text-ink-500">Trải nghiệm</th><th className="p-4 font-semibold text-ink-700">Đọc trên website nguồn</th><th className="p-4 font-semibold text-ink-700">App đọc file thông thường</th><th className="bg-lily-50 p-4 font-bold text-lily-900">Lily Reader</th></tr></thead>
                <tbody>{COMPARISON_ROWS.map(row => <ComparisonRow key={row.label} {...row} />)}</tbody>
              </table>
            </div>
            <div className="mt-6 flex flex-col items-start justify-between gap-4 rounded-2xl border border-lily-200 bg-lily-50 p-4 sm:flex-row sm:p-5 sm:items-center"><div><p className="font-serif text-base font-bold text-ink-950">Khác biệt lớn nhất: quyền kiểm soát quay về với bạn.</p><p className="mt-1 text-xs leading-5 text-ink-600">Bạn chọn nguồn, chọn chương cần giữ và đọc trong giao diện của mình — không phải quay lại từng website mỗi lần muốn đọc tiếp.</p></div><button type="button" onClick={() => navigateTo('dashboard')} className="inline-flex min-h-10 shrink-0 items-center gap-2 rounded-xl bg-ink-950 px-4 text-xs font-semibold text-white">Dùng thử miễn phí <ArrowRight className="h-3.5 w-3.5" /></button></div>
          </div>
        </section>

        <section id="bang-gia" className="mx-auto max-w-6xl px-5 py-10 sm:px-8 sm:py-14">
          <div className="flex flex-col justify-between gap-4 border-b border-ink-300 pb-5 sm:flex-row sm:items-end"><div><p className="text-[11px] font-semibold uppercase tracking-[0.14em] text-ink-500">Gói thành viên</p><h2 className="mt-3 font-serif text-2xl font-bold text-ink-950 sm:text-[1.75rem]">Chọn theo số truyện cần lưu</h2></div><p className="max-w-sm text-xs leading-5 text-ink-500">Truyện được lưu trên thiết bị. Những tính năng ghi “Đang phát triển” chưa nằm trong gói hiện hành.</p></div>
          <div className="mt-6 grid gap-4 md:grid-cols-3">
            {availablePlans.map(plan => (
              <article key={plan.name} className={`flex flex-col rounded-3xl border bg-white p-5 shadow-soft ${plan.recommended ? 'border-lily-300 ring-1 ring-lily-200' : 'border-ink-200'}`}>
                <div><h3 className="font-serif text-base font-bold text-ink-950">{plan.name}</h3>{plan.recommended && <span className="mt-1 block text-[11px] font-bold uppercase tracking-wide text-lily-800">Phù hợp số đông</span>}</div>
                <div className="mt-3"><p className="font-serif text-lg font-bold text-lily-900">{plan.price}</p><p className={`mt-1 ${plan.total.startsWith('Chỉ khoảng') ? 'text-xs font-normal text-ink-400' : 'text-xs font-semibold text-ink-700'}`}>{plan.total}</p></div>
                <div className="flex-1"><p className="mt-4 text-xs leading-5 text-ink-500">{plan.summary}</p><ul className="mt-4 space-y-2 text-xs text-ink-600">{plan.benefits.map(benefit => <li key={benefit} className="flex items-start gap-1.5"><Check className="mt-0.5 h-3 w-3 shrink-0 text-emerald-700" />{benefit}</li>)}</ul></div>
                {plan.pending ? <span className="mt-5 text-xs font-semibold text-ink-400">Đang phát triển</span> : <button type="button" onClick={() => plan.tier === 'free' ? navigateTo('dashboard') : buyOnTelegram(plan.tier)} className={`mt-5 min-h-10 rounded-xl px-4 text-xs font-semibold ${plan.recommended ? 'bg-ink-950 text-white' : 'border border-ink-300 bg-white'}`}>{plan.tier === 'free' ? 'Dùng miễn phí' : `Chọn ${plan.name}`}</button>}
                <button type="button" onClick={() => openPlanDemo(plan.name)} className="mt-2 min-h-9 rounded-xl px-4 text-xs font-semibold text-lily-800 hover:bg-lily-50">Xem chức năng</button>
              </article>
            ))}
          </div>
          <div className="mt-6 grid gap-3 md:grid-cols-3">
            <InfoCard icon={<FileText />} title="Sao lưu · MY30 và MY100" note="Không tự đồng bộ · Không lưu trên Cloud">Tải một file về máy để tự cất giữ. Khi đổi thiết bị, bạn tự chuyển file sang máy mới và chọn <strong>Khôi phục</strong>.</InfoCard>
            <InfoCard icon={<MessageCircle />} title="Sau khi chọn gói" action={<button type="button" onClick={() => navigateTo('legal')} className="text-xs font-semibold text-lily-800 underline">Xem điều khoản và hoàn tiền</button>}>Bot Telegram xác nhận gói và tài khoản LilyHub, tạo mã đơn rồi hướng dẫn thanh toán. Khi gói được kích hoạt, quay lại trang Tài khoản để kiểm tra.</InfoCard>
            <InfoCard icon={<Cloud />} title="Đồng bộ nhiều thiết bị đang được phát triển" action={<a href="https://t.me/+Y8M62X2kWBIxODg9" target="_blank" rel="noreferrer" className="text-xs font-semibold text-lily-800">Theo dõi cập nhật →</a>}>MY CLOUD chưa thuộc các gói đang bán. Bạn vẫn có thể sao lưu thủ công với MY30 hoặc MY100.</InfoCard>
          </div>
        </section>

        <section className="border-t border-ink-100 bg-white/60 px-5 py-10 sm:px-8 sm:py-14">
          <div className="mx-auto grid max-w-6xl gap-6 lg:grid-cols-[0.75fr_1.25fr] lg:gap-10">
            <div><p className="text-[11px] font-semibold uppercase tracking-[0.14em] text-ink-500">Câu hỏi thường gặp</p><h2 className="mt-3 font-serif text-2xl font-bold text-ink-950 sm:text-[1.75rem]">Biết rõ trước khi bắt đầu.</h2><p className="mt-4 text-[13px] leading-6 text-ink-600">Nếu nguồn của bạn không nhập được hoặc cần kiểm tra gói, đội ngũ Lily hỗ trợ trực tiếp qua Telegram.</p></div>
            <div className="divide-y divide-ink-200 border-y border-ink-200">
              <Faq question="Tôi có cần đăng nhập để dùng thử không?">Không. Bạn có thể mở thư viện và thêm truyện trên thiết bị trước. Tài khoản LilyHub cần thiết khi lấy truyện từ LilyHub hoặc kích hoạt gói đã mua.</Faq>
              <Faq question="Nội dung truyện được lưu ở đâu?">Truyện, tiến độ, ghi chú và đánh dấu được lưu trong trình duyệt trên thiết bị. Lily không tự đồng bộ lên Cloud.</Faq>
              <Faq question="Xóa dữ liệu trình duyệt có làm mất truyện không?">Có thể. MY30 và MY100 có chức năng tạo file sao lưu thủ công; hãy lưu file này trước khi đổi máy hoặc xóa dữ liệu trình duyệt.</Faq>
              <Faq question="Vì sao có website không nhập được?">Website phải công khai và có cấu trúc Lily hỗ trợ. Lily không vượt đăng nhập, CAPTCHA, paywall hoặc biện pháp bảo vệ truy cập.</Faq>
              <Faq question="Giọng Lily có nghe ngoại tuyến được không?">Có. Sau khi tải giọng và tài nguyên cần thiết về thiết bị, bạn có thể nghe nội dung đã lưu mà không cần mạng.</Faq>
              <Faq question="Gói được mua và kích hoạt như thế nào?">Bot Telegram xác nhận tài khoản, tạo mã đơn và hướng dẫn thanh toán. Quản trị viên kích hoạt gói sau khi kiểm tra giao dịch; thời gian xử lý phụ thuộc thời điểm giao dịch được xác nhận.</Faq>
              <Faq question="Gói có tự động gia hạn không?">Không. Khi gần hết hạn, Lily Reader sẽ nhắc trong ứng dụng và bạn chủ động quyết định có gia hạn hay không.</Faq>
              <Faq question="Khi nào tôi được hoàn tiền?">Nếu Lily Reader ngừng hoạt động lâu dài hoặc có sự cố từ phía Lily khiến bạn không thể tiếp tục dùng quyền lợi đã mua, Lily sẽ xem xét hoàn phần thời gian còn lại chưa sử dụng sau khi trừ thời gian gói đã hoạt động.</Faq>
            </div>
          </div>
        </section>

        <section className="px-5 py-10 sm:px-8 sm:py-14"><div className="mx-auto flex max-w-4xl flex-col items-center rounded-3xl border border-lily-200 bg-lily-50 px-5 py-9 text-center sm:py-12"><p className="text-[11px] font-semibold uppercase tracking-[0.14em] text-lily-700">Thư viện đầu tiên chỉ mất vài phút</p><h2 className="mt-2.5 max-w-2xl font-serif text-2xl font-bold text-ink-950 [text-wrap:balance] sm:text-3xl">Thử với một truyện bạn đang đọc dở.</h2><p className="mt-2.5 max-w-xl text-[13px] leading-6 text-ink-600">Không cần đăng nhập. Miễn phí tối đa 10 truyện và bạn có thể nâng cấp sau.</p><button type="button" onClick={() => navigateTo('dashboard')} className="mt-5 inline-flex min-h-11 items-center gap-2 rounded-xl bg-ink-950 px-6 text-sm font-semibold text-white">Mở thư viện miễn phí <ArrowRight className="h-4 w-4" /></button></div></section>
      </main>

      <footer className="border-t border-ink-200 bg-[#F3EFE8] px-5 pb-[max(1.25rem,env(safe-area-inset-bottom))] pt-6 text-xs text-ink-600 sm:px-8 sm:pb-7">
        <div className="mx-auto max-w-6xl">
          <div className="flex items-start gap-2.5 border-b border-ink-200 pb-5"><ShieldCheck className="mt-0.5 h-4 w-4 shrink-0 text-emerald-700" /><div className="flex-1 sm:flex sm:items-center sm:justify-between sm:gap-6"><div><h2 className="font-serif text-[15px] font-bold text-ink-950">Dữ liệu là của bạn</h2><p className="mt-0.5 text-xs leading-5 text-ink-600">Lưu trên thiết bị, chỉ đồng bộ khi bạn bật.</p></div><button type="button" onClick={() => navigateTo('legal')} className="mt-2 text-xs font-semibold text-lily-800 underline sm:mt-0 sm:shrink-0">Chính sách dữ liệu</button></div></div>
          <div className="flex flex-col justify-between gap-2.5 pt-5 sm:flex-row sm:items-center sm:gap-4"><p><strong className="font-serif text-ink-950">Lily Reader</strong> · by LilyHub · © 2026</p><div className="flex flex-wrap gap-x-4 gap-y-1.5"><button type="button" onClick={() => navigateTo('legal')} className="hover:text-ink-950">Điều khoản & quyền riêng tư</button><a href="https://t.me/+Y8M62X2kWBIxODg9" target="_blank" rel="noreferrer" className="hover:text-ink-950">Cộng đồng Lily</a><a href="https://t.me/noooo4518" target="_blank" rel="noreferrer" className="hover:text-ink-950">Trợ giúp</a></div></div>
        </div>
      </footer>

      {demoSlide && demoSlides && demoPlanName && (
        <div className="fixed inset-0 z-[100] flex items-end justify-center bg-ink-950/45 backdrop-blur-sm sm:items-center sm:p-4" role="dialog" aria-modal="true" aria-labelledby="plan-demo-title" onClick={closeDemo}>
          <section className="flex max-h-[100dvh] w-full max-w-lg flex-col overflow-y-auto rounded-t-3xl border border-ink-100 bg-[#FFFCFA] shadow-modal sm:rounded-3xl" onClick={event => event.stopPropagation()}>
            <header className="flex items-center justify-between gap-3 px-5 pb-3 pt-5 sm:px-6">
              <div className="min-w-0"><p className="text-[11px] font-bold uppercase tracking-[0.14em] text-lily-700">{isProductDemo ? 'Xem một hành trình hoàn chỉnh' : 'Khám phá gói'}</p><h2 id="plan-demo-title" className="mt-1 font-serif text-xl font-bold text-ink-950 sm:text-2xl">{isProductDemo ? 'Lily hoạt động thế nào?' : demoPlanName}</h2></div>
              <button type="button" onClick={closeDemo} className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full text-ink-500 hover:bg-ink-100" aria-label="Đóng"><X className="h-5 w-5" /></button>
            </header>

            <nav className="px-5 sm:px-6" aria-label="Các bước">
              <div className="flex gap-1.5">{demoSlides.map((slide, index) => <button key={index} type="button" onClick={() => setDemoSlideIndex(index)} className="group flex-1 py-1.5" aria-label={`Xem ${slide.eyebrow}`} aria-current={index === demoSlideIndex ? 'step' : undefined}><span className={`block h-1 rounded-full transition-colors ${index <= demoSlideIndex ? 'bg-lily-600' : 'bg-ink-200 group-hover:bg-ink-300'}`} /></button>)}</div>
              {isProductDemo && <div className="mt-1 flex gap-1.5">{demoSlides.map((slide, index) => <button key={index} type="button" onClick={() => setDemoSlideIndex(index)} className={`flex-1 truncate text-left text-[11px] font-semibold transition-colors ${index === demoSlideIndex ? 'text-ink-900' : 'text-ink-400 hover:text-ink-600'}`}>{PRODUCT_STEP_LABELS[index]}</button>)}</div>}
            </nav>

            <div key={`${demoPlanName}-${demoSlideIndex}`} className="lily-demo-in px-5 pt-4 sm:px-6">
              <div className="h-[17rem] overflow-hidden sm:h-[17.5rem] rounded-2xl border border-ink-100 bg-[#F4EEE9]"><DemoVisual scene={demoSlide.scene} /></div>
              <div className="min-h-[8.5rem] pt-4 text-center">
                <p className="text-[10px] font-bold uppercase tracking-[0.14em] text-lily-700">{demoSlide.eyebrow}</p>
                <h3 className="mt-1 font-serif text-base font-bold leading-snug text-ink-950 [text-wrap:balance] sm:text-lg">{demoSlide.title}</h3>
                <p className="mx-auto mt-1.5 max-w-xs text-xs leading-5 text-ink-500">{demoSlide.description}</p>
              </div>
            </div>

            <footer className="mt-auto flex items-center gap-2 px-5 pb-[max(1.25rem,env(safe-area-inset-bottom))] pt-2 sm:px-6 sm:pb-6">
              {!isLastDemoSlide && <button type="button" onClick={finishDemo} className="min-h-10 rounded-lg px-1 text-sm font-medium text-ink-500 hover:text-ink-800">Bỏ qua</button>}
              <div className="ml-auto flex items-center gap-2">
                <button type="button" onClick={() => setDemoSlideIndex(index => Math.max(0, index - 1))} className={`inline-flex h-10 w-10 items-center justify-center rounded-xl text-ink-600 hover:bg-ink-100 ${demoSlideIndex === 0 ? 'invisible' : ''}`} aria-label="Bước trước"><ChevronLeft className="h-5 w-5" /></button>
                {isLastDemoSlide
                  ? <button type="button" onClick={finishDemo} className="inline-flex h-10 items-center gap-1.5 rounded-xl bg-ink-950 px-4 text-sm font-semibold text-white">{demoCtaLabel} <ArrowRight className="h-4 w-4" /></button>
                  : <button type="button" onClick={() => setDemoSlideIndex(index => Math.min(demoSlides.length - 1, index + 1))} className="inline-flex h-10 items-center gap-1.5 rounded-xl bg-ink-950 px-5 text-sm font-semibold text-white">Tiếp theo <ChevronRight className="h-4 w-4" /></button>}
              </div>
            </footer>
          </section>
        </div>
      )}
    </div>
  );
};

const SourcePreview: React.FC<{ icon: React.ReactElement; title: string; text: string }> = ({ icon, title, text }) => <div className="flex items-center gap-3 rounded-2xl border border-ink-100 bg-[#FAF9F7] px-4 py-3 sm:block sm:py-4"><span className="flex shrink-0 text-lily-700 [&>svg]:h-4 [&>svg]:w-4">{icon}</span><span className="block sm:mt-3"><strong className="block font-serif text-sm text-ink-950">{title}</strong><span className="mt-0.5 block text-xs text-ink-500 sm:mt-1">{text}</span></span></div>;
const Feature: React.FC<{ icon: React.ReactElement; title: string; children: React.ReactNode }> = ({ icon, title, children }) => <article className="rounded-2xl border border-ink-100 bg-white p-4 shadow-soft sm:p-5"><span className="text-lily-700 [&>svg]:h-4 [&>svg]:w-4">{icon}</span><h3 className="mt-2.5 font-serif text-[15px] font-bold">{title}</h3><p className="mt-2 text-xs leading-5 text-ink-600">{children}</p></article>;
const Step: React.FC<{ icon: React.ReactElement; number: string; title: string; children: React.ReactNode }> = ({ icon, number, title, children }) => <article className="flex gap-3"><span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-lily-50 text-lily-800 [&>svg]:h-4 [&>svg]:w-4">{icon}</span><div><p className="text-[10px] font-bold tracking-[0.12em] text-ink-400">BƯỚC {number}</p><h3 className="mt-0.5 font-serif text-[15px] font-bold text-ink-950">{title}</h3><p className="mt-1 text-xs leading-5 text-ink-600">{children}</p></div></article>;
const SourceDetail: React.FC<{ icon: React.ReactElement; title: string; children: React.ReactNode }> = ({ icon, title, children }) => <article className="rounded-2xl border border-ink-100 bg-white p-4 shadow-soft"><span className="text-lily-700 [&>svg]:h-4 [&>svg]:w-4">{icon}</span><h3 className="mt-2 font-serif text-[15px] font-bold text-ink-950">{title}</h3><p className="mt-2 text-xs leading-5 text-ink-600">{children}</p></article>;
const InfoCard: React.FC<{ icon: React.ReactElement; title: string; note?: string; action?: React.ReactNode; children: React.ReactNode }> = ({ icon, title, note, action, children }) => <article className="flex flex-col rounded-2xl border border-ink-200 bg-white p-4"><div className="flex items-center gap-2 text-lily-800 [&>svg]:h-4 [&>svg]:w-4 [&>svg]:shrink-0">{icon}<h3 className="text-[13px] font-bold text-ink-900">{title}</h3></div><p className="mt-2 flex-1 text-xs leading-5 text-ink-600">{children}</p>{note && <p className="mt-3 text-xs text-ink-400">{note}</p>}{action && <div className="mt-3">{action}</div>}</article>;
const Faq: React.FC<{ question: string; children: React.ReactNode }> = ({ question, children }) => <details className="group py-3.5"><summary className="flex cursor-pointer list-none items-center justify-between gap-4 text-[13px] font-semibold text-ink-900"><span>{question}</span><span className="text-lg font-normal text-lily-700 transition-transform group-open:rotate-45" aria-hidden="true">+</span></summary><p className="max-w-2xl pt-3 text-xs leading-5 text-ink-600">{children}</p></details>;
type ComparisonRowData = { label: string; website: string; fileApp: string; lily: string };
const ComparisonItem: React.FC<ComparisonRowData> = ({ label, website, fileApp, lily }) => <li className="py-3"><p className="text-[11px] font-medium text-ink-500">{label}</p><p className="mt-0.5 flex items-start gap-1.5 text-[13px] font-semibold leading-5 text-lily-900"><Check className="mt-0.5 h-3.5 w-3.5 shrink-0 text-emerald-700" />{lily}</p><p className="mt-1 text-[11px] leading-4 text-ink-400">Website: {website} · App đọc file: {fileApp}</p></li>;
const ComparisonRow: React.FC<ComparisonRowData> = ({ label, website, fileApp, lily }) => <tr className="border-b border-ink-100 last:border-0"><th scope="row" className="p-4 font-semibold text-ink-800">{label}</th><td className="p-4 leading-5 text-ink-500">{website}</td><td className="p-4 leading-5 text-ink-500">{fileApp}</td><td className="bg-lily-50/60 p-4 font-semibold leading-5 text-lily-950"><span className="mr-1.5 text-emerald-700">✓</span>{lily}</td></tr>;

const DemoVisual: React.FC<{ scene: DemoScene }> = ({ scene }) => {
  const card = 'rounded-xl border border-ink-100 bg-white';
  const cover = 'rounded-md bg-gradient-to-br from-lily-300 to-amber-100';
  return <div className="relative flex h-full items-center justify-center overflow-hidden p-3 text-ink-900 sm:p-4">
    <div className="absolute -right-12 -top-14 h-44 w-44 rounded-full bg-lily-200/50 blur-2xl" />
    <div className="absolute -bottom-16 -left-12 h-40 w-40 rounded-full bg-amber-100/70 blur-2xl" />
    <div className="relative flex h-full w-full max-w-[20rem] flex-col rounded-2xl border border-white bg-[#FCFAF8] p-3.5 shadow-float">

      {scene === 'import' && <><p className="font-serif text-base font-bold">Thêm truyện</p><p className="text-xs text-ink-500">Bạn muốn lấy truyện từ đâu?</p><div className="mt-3 grid grid-cols-3 gap-2">{([[Library, 'LilyHub'], [FileText, 'Thiết bị'], [Globe2, 'Website']] as const).map(([Icon, label], index) => <div key={label} className={`${card} flex flex-col items-center gap-1.5 py-3 ${index === 0 ? 'border-lily-300 ring-1 ring-lily-200' : ''}`}><Icon className="h-5 w-5 text-lily-700" /><span className="text-[11px] font-semibold">{label}</span></div>)}</div><div className={`${card} mt-auto flex items-center gap-3 p-2.5`}><div className={`h-12 w-9 shrink-0 ${cover}`} /><div className="min-w-0 flex-1"><p className="truncate font-serif text-xs font-bold">Ảnh Hậu Nàng Ẩn Hôn Sinh Con</p><p className="mt-0.5 text-[11px] text-ink-500">Nhĩ Nha · 96 chương</p></div><Check className="h-4 w-4 shrink-0 text-emerald-600" /></div></>}

      {scene === 'preview' && <><div className="flex items-center justify-between gap-2"><p className="font-serif text-base font-bold">Kiểm tra trước khi lưu</p><span className="shrink-0 rounded-full bg-emerald-50 px-2 py-0.5 text-[10px] font-bold text-emerald-700">Sẵn sàng</span></div><div className={`${card} mt-3 flex gap-3 p-2.5`}><div className={`h-14 w-10 shrink-0 ${cover}`} /><div className="min-w-0 flex-1"><p className="truncate font-serif text-xs font-bold">Ảnh Hậu Nàng Ẩn Hôn Sinh Con</p><p className="mt-0.5 text-[11px] text-ink-500">Tác giả: Nhĩ Nha</p></div></div><div className="mt-2 grid grid-cols-3 gap-2">{[['96', 'chương'], ['1–96', 'khoảng chọn'], ['Đủ', 'không thiếu']].map(([value, label]) => <div key={label} className={`${card} py-1.5 text-center`}><p className="font-serif text-sm font-bold text-lily-900">{value}</p><p className="text-[10px] text-ink-500">{label}</p></div>)}</div><div className="mt-auto flex items-center justify-center gap-1.5 rounded-lg bg-ink-900 py-2 text-xs font-semibold text-white"><Check className="h-3.5 w-3.5" /> Lưu vào thư viện</div></>}

      {scene === 'reader' && <><div className="flex items-center justify-between text-[11px] font-semibold tracking-wider text-ink-400"><span>CHƯƠNG 12</span><Bookmark className="h-4 w-4 text-lily-700" /></div><h4 className="mt-2 text-center font-serif text-lg font-bold">Ngày trở về</h4><div className="mx-auto mt-1.5 h-px w-10 bg-lily-300" /><div className="mt-3 space-y-2">{[100, 94, 98, 84, 70].map((width, index) => <span key={index} className="block h-1.5 rounded-full bg-ink-200/80" style={{ width: `${width}%` }} />)}</div><div className={`${card} mt-auto flex items-center justify-around py-2 text-lily-800`}><span className="font-serif text-sm font-bold">Aa</span><Palette className="h-4 w-4" /><Bookmark className="h-4 w-4" /><Headphones className="h-4 w-4" /></div></>}

      {scene === 'voices' && <><div className="flex items-center gap-2.5"><span className="flex h-9 w-9 items-center justify-center rounded-full bg-lily-100"><Headphones className="h-4 w-4 text-lily-800" /></span><div><p className="font-serif text-base font-bold leading-tight">Chọn giọng đọc</p><p className="text-[11px] text-ink-500">Tải một lần, nghe ngoại tuyến</p></div></div><div className="mt-2.5 space-y-1.5">{([['Lily Thảo', 'Êm dịu · kể chuyện', true], ['Lily Huyền', 'Trong trẻo · truyền cảm', false], ['Giọng thiết bị', 'Có sẵn trên máy', false]] as const).map(([name, detail, active]) => <div key={name} className={`${card} flex items-center gap-2.5 px-2.5 py-1.5 ${active ? 'border-lily-300 ring-1 ring-lily-200' : ''}`}><span className={`flex h-7 w-7 items-center justify-center rounded-full ${active ? 'bg-lily-700 text-white' : 'bg-ink-100 text-ink-500'}`}><Headphones className="h-3.5 w-3.5" /></span><div className="flex-1"><p className="text-xs font-bold">{name}</p><p className="text-[10px] text-ink-500">{detail}</p></div>{active && <Check className="h-4 w-4 text-lily-700" />}</div>)}</div></>}

      {scene === 'library' && <><div className="flex items-end justify-between"><div><p className="font-serif text-base font-bold">Thư viện</p><p className="text-[11px] text-ink-500">12 truyện trên thiết bị</p></div><span className="rounded-full bg-lily-100 px-2 py-0.5 text-[10px] font-bold text-lily-800">MY</span></div><div className="mt-auto grid grid-cols-3 gap-2">{['from-lily-200 to-purple-200', 'from-amber-100 to-orange-200', 'from-sky-100 to-blue-200'].map((color, index) => <div key={color} className={`${card} p-1.5`}><div className={`flex h-24 items-center justify-center rounded-lg bg-gradient-to-br font-serif text-xl text-white/80 ${color}`}>{['A', 'C', 'M'][index]}</div><p className="mt-1.5 truncate text-[11px] font-bold">{['Ảnh hậu', 'Cơ duyên', 'Mộng lý'][index]}</p><span className="mt-1 block h-1 rounded-full bg-lily-100"><span className="block h-full rounded-full bg-lily-600" style={{ width: `${[72, 36, 18][index]}%` }} /></span></div>)}</div></>}

      {scene === 'themes' && <><p className="font-serif text-base font-bold">Không gian đọc</p><div className="mt-3 grid grid-cols-3 gap-2">{[['Giấy', '#F8F1E5'], ['Đêm', '#292420'], ['Hồng trà', '#F5E5E8']].map(([name, color], index) => <div key={name} className={`${card} p-1.5 ${index === 0 ? 'border-lily-300 ring-1 ring-lily-200' : ''}`}><div className="h-12 rounded-lg border border-black/5" style={{ background: color }} /><p className="mt-1 text-center text-[11px] font-semibold">{name}</p></div>)}</div><div className={`${card} mt-auto p-3`}><div className="flex justify-between text-xs"><span>Cỡ chữ</span><strong>18</strong></div><div className="mt-2 h-1.5 rounded-full bg-ink-100"><div className="h-full w-2/3 rounded-full bg-lily-500" /></div><div className="mt-3 flex gap-2"><span className="rounded-full bg-lily-100 px-2.5 py-0.5 text-[11px] text-lily-800">Tự cuộn</span><span className="rounded-full bg-ink-100 px-2.5 py-0.5 text-[11px]">Tập trung</span></div></div></>}

      {scene === 'shelves' && <><p className="font-serif text-base font-bold">Tủ sách</p><div className="mt-2.5 space-y-1.5">{[['Đang đọc', '8 truyện', 'bg-lily-500'], ['Yêu thích', '3 truyện', 'bg-rose-400'], ['Đã hoàn thành', '24 truyện', 'bg-emerald-500']].map(([name, count, color]) => <div key={name} className={`${card} flex items-center gap-3 px-2.5 py-2`}><span className={`h-8 w-1 rounded-full ${color}`} /><div className="flex-1"><p className="font-serif text-sm font-bold">{name}</p><p className="text-[11px] text-ink-500">{count}</p></div><ChevronRight className="h-4 w-4 text-ink-400" /></div>)}</div></>}

      {scene === 'backup' && <div className="flex h-full flex-col items-center justify-center text-center"><span className="flex h-12 w-12 items-center justify-center rounded-2xl bg-lily-100"><ShieldCheck className="h-6 w-6 text-lily-800" /></span><h4 className="mt-2.5 font-serif text-base font-bold">Thư viện luôn theo bạn</h4><p className="mt-1 max-w-[15rem] text-[11px] leading-4 text-ink-500">Sao lưu truyện, tiến độ, ghi chú và tủ sách vào một tệp.</p><div className="mt-3 grid w-full grid-cols-2 gap-2"><div className={`${card} py-2.5`}><FileText className="mx-auto h-4 w-4 text-lily-700" /><p className="mt-1 text-xs font-bold">Tạo sao lưu</p></div><div className={`${card} py-2.5`}><ArrowRight className="mx-auto h-4 w-4 text-lily-700" /><p className="mt-1 text-xs font-bold">Khôi phục</p></div></div></div>}

      {scene === 'cloud' && <div className="flex h-full flex-col items-center justify-center text-center"><span className="flex h-14 w-14 items-center justify-center rounded-full bg-gradient-to-br from-lily-100 to-white shadow-soft"><Cloud className="h-6 w-6 text-lily-700" /></span><h4 className="mt-2.5 font-serif text-base font-bold">500 MB Cloud</h4><p className="text-[11px] text-ink-500">Khoảng 200–500 truyện tùy dung lượng</p><div className={`${card} mt-3 w-full p-3 text-left`}><div className="flex items-center justify-between text-xs"><span>Đã sử dụng</span><strong>0 / 500 MB</strong></div><div className="mt-2 h-1.5 rounded-full bg-ink-100"><div className="h-full w-[8%] rounded-full bg-lily-500" /></div><p className="mt-2.5 flex items-center justify-center gap-1 text-[11px] font-semibold text-lily-800"><Sparkles className="h-3 w-3" /> Đang phát triển</p></div></div>}
    </div>
  </div>;
};
