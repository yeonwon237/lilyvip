// DEV/TEST ONLY.
//
// Hand-authored HTML fixtures for exercising JjwxcChapterExtractor and
// JjwxcTocLoader without a real authenticated/live fetch. The markup shape
// (content_ul, chapter_list_box, h2.big, the /my/login redirect for locked
// content) is calibrated against a real anonymous fetch of a live,
// free wap.jjwxc.net page via JjwxcAdapter — see the comments in
// JjwxcChapterExtractor.ts/JjwxcTocLoader.ts/jjwxcStatusMarkers.ts. All prose
// text below is Lily's own placeholder writing, not copied from any real
// JJWXC novel — only the surrounding HTML structure is meant to match.
//
// Must never be imported by JjwxcAdapter or any real import path — only by
// the owner-only dev fixture panel on JjwxcConnectPage and by unit tests.

export interface JjwxcFixture {
  id: string;
  label: string;
  html: string;
}

const PURCHASED_CHAPTER_HTML = `<!doctype html>
<html><head><title>《示例小说》某作者 ^第3章^ 最新更新：2026-01-01 12:00:00 晋江文学城手机版</title></head>
<body>
  <a href="/book2/1/2">上一章</a> <a href="/book2/1">目录</a> <a href="/book2/1/4">下一章</a>
  <div class="b module">
    <h2 class="big o">3、第 3 章 归途</h2>
    <div style="padding:1px;font-size:14px;position: relative">
      <ul class="content_ul">
        <li style="line-height: 25.2px;" class="">
          　　夜色渐深，她终于踏上了回家的路。<br><br>
          　　风吹过巷口，带着一点凉意，却让人心里安定下来。<br><br>
          　　“到了。”她轻声说道，推开了那扇熟悉的门。
        </li>
      </ul>
    </div>
  </div>
  <div class="comment-form">发表评论...</div>
</body></html>`;

const LOCKED_CHAPTER_HTML = `<!doctype html>
<html><head><title>《示例小说》某作者 ^第4章^ 最新更新：2026-01-01 12:00:00 晋江文学城手机版</title></head>
<body>
  <div class="b module">
    <h2 class="big o"><a href="/">首页</a>&gt;<a href="/my">我的</a></h2>
    <span style="color: red">VIP章节，请<a href='/my/login?referer=//wap.jjwxc.net/vip/1/4?ctime=1'>登录</a>后查看哦!</span>
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
<html><head><title>《示例小说》某作者_晋江文学城_【原创小说|纯爱小说】</title></head>
<body>
  <li class="authorname-content">作者：<a href="/wapauthor/1">某作者</a></li>
  <div id="chapter_list_box">
    章节列表：<br/>
    <a style="text-decoration:none;" href="/book2/1/1" class=''><span>第一章 初见</span></a><br>
    <a style="text-decoration:none;" href="/book2/1/2" class=''><span>第二章 相识</span></a><br>
    <a style="text-decoration:none;" href="/book2/1/3" class=''><span>第三章 归途</span></a><br>
    <a style='display:block;text-align:center' href='/book2/1?more=0&whole=1#chapter_list_box'> &gt;&gt;点击展开全部章节&lt;&lt; </a>
    <a style="text-decoration:none;" href="/vip/1/4?ctime=1" class=''><span>第四章 惊变</span></a><br>
  </div>
</body></html>`;

export const JJWXC_DEV_FIXTURES: JjwxcFixture[] = [
  { id: 'purchased', label: 'Chương công khai (ok)', html: PURCHASED_CHAPTER_HTML },
  { id: 'locked', label: 'Chương VIP/chưa mua (locked/session_expired)', html: LOCKED_CHAPTER_HTML },
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
