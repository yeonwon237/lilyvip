// DEV/TEST ONLY.
//
// Hand-authored HTML fixtures for exercising JjwxcChapterExtractor and
// JjwxcTocLoader without a real authenticated WebView session. They are Lily's
// own guess at plausible page shapes (see the UNVERIFIED selector comments in
// those two files) — they prove the status-classification LOGIC branches
// correctly, not that the guessed selectors match a real wap.jjwxc.net page.
//
// Must never be imported by JjwxcWebViewService or any real login/extraction
// path — only by the owner-only dev fixture panel on JjwxcConnectPage and by
// unit tests. Nothing here is used to fake a purchased/logged-in state for an
// actual user; it only feeds the pure HTML parser.

export interface JjwxcFixture {
  id: string;
  label: string;
  html: string;
}

const PURCHASED_CHAPTER_HTML = `<!doctype html>
<html><head><title>第三章 归途 - 示例小说 - 晋江文学城</title></head>
<body>
  <div class="chapter-nav">上一章 | 目录 | 下一章</div>
  <h1>第三章 归途</h1>
  <div id="noveltext">
    <p>夜色渐深，她终于踏上了回家的路。</p>
    <p>风吹过巷口，带着一点凉意，却让人心里安定下来。</p>
    <p>“到了。”她轻声说道，推开了那扇熟悉的门。</p>
  </div>
  <div class="comment-form">发表评论...</div>
</body></html>`;

const LOCKED_CHAPTER_HTML = `<!doctype html>
<html><head><title>第四章 未购买章节 - 示例小说 - 晋江文学城</title></head>
<body>
  <div class="chapter-nav">上一章 | 目录 | 下一章</div>
  <h1>第四章 未购买章节</h1>
  <div class="vip-lock-box">
    <p>本章为VIP章节，您尚未购买。</p>
    <a class="buy-btn" href="#">购买本章</a>
  </div>
</body></html>`;

const SESSION_EXPIRED_HTML = `<!doctype html>
<html><head><title>用户登录 - 晋江文学城</title></head>
<body>
  <form id="loginform" action="/login.php" method="post">
    <p>请先登录后查看本章内容</p>
    <input type="text" name="username" />
    <input type="password" name="password" />
    <button type="submit">立即登录</button>
  </form>
</body></html>`;

const UNKNOWN_FORMAT_HTML = `<!doctype html>
<html><head><title>404 Not Found</title></head>
<body>
  <div class="error-page">
    <p>Điều gì đó đã thay đổi trên trang này mà bộ phân tích chưa từng thấy.</p>
  </div>
</body></html>`;

const TOC_OK_HTML = `<!doctype html>
<html><head><title>示例小说 - 晋江文学城</title></head>
<body>
  <h1>示例小说</h1>
  <p>作者：<a href="/authorInfo.php?id=1">墨言</a></p>
  <div id="oneboolt">
    <a href="/onebook.php?novelid=9209789&amp;chapterid=1">第一章 初见</a>
    <a href="/onebook.php?novelid=9209789&amp;chapterid=2">第二章 相识</a>
    <a href="/onebook.php?novelid=9209789&amp;chapterid=3">第三章 归途</a>
  </div>
</body></html>`;

export const JJWXC_DEV_FIXTURES: JjwxcFixture[] = [
  { id: 'purchased', label: 'Chương đã mua (ok)', html: PURCHASED_CHAPTER_HTML },
  { id: 'locked', label: 'Chương chưa mua (locked)', html: LOCKED_CHAPTER_HTML },
  { id: 'session_expired', label: 'Hết phiên đăng nhập (session_expired)', html: SESSION_EXPIRED_HTML },
  { id: 'unknown_format', label: 'HTML lạ / không nhận diện được (unknown_format)', html: UNKNOWN_FORMAT_HTML },
];

export {
  PURCHASED_CHAPTER_HTML,
  LOCKED_CHAPTER_HTML,
  SESSION_EXPIRED_HTML,
  UNKNOWN_FORMAT_HTML,
  TOC_OK_HTML,
};
