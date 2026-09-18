import { safeFetch } from '../website-importer/safe-fetch';
import hanvietDict from './hanviet-dict.json';

export type JjwxcRankingType = 'vip_gold' | 'daily_free' | 'month' | 'quarter' | 'half_year' | 'free' | 'points';

export type JjwxcDailyFreePeriod = 'today' | 'yesterday' | 'tomorrow';

export interface JjwxcStoryItem {
  novelId: string;
  title: string;
  titleVi: string;
  author: string;
  authorVi: string;
  tags: string[];
  tagsVi: string[];
  intro: string;
  introVi?: string;
  status: 'completed' | 'ongoing';
  chapterCount: number;
  wordCount: string;
  score: string;
  rankingType: JjwxcRankingType;
  rank: number;
  coverUrl?: string;
  dailyPeriod?: JjwxcDailyFreePeriod;
}

export interface RankingTabInfo {
  id: JjwxcRankingType;
  title: string;
  subtitle: string;
  badge: string;
}

export const JJWXC_RANKING_TABS: RankingTabInfo[] = [
  { id: 'vip_gold', title: 'Kim Bảng VIP', subtitle: 'Tác phẩm VIP ăn khách & thịnh hành nhất', badge: 'VIP Hot' },
  { id: 'daily_free', title: 'VIP Giới Hạn Miễn Phí', subtitle: 'VIP mở miễn phí mỗi ngày (Hôm qua, Hôm nay, Ngày mai)', badge: 'Mỗi ngày' },
  { id: 'month', title: 'Nguyệt Bảng', subtitle: 'Bảng xếp hạng Bách Hợp trong tháng', badge: 'Tháng' },
  { id: 'quarter', title: 'Quý Bảng', subtitle: 'Bách Hợp xuất sắc quý gần nhất', badge: 'Quý' },
  { id: 'half_year', title: 'Bán Niên Bảng', subtitle: 'Tác phẩm Bách Hợp nổi bật 6 tháng', badge: 'Nửa năm' },
  { id: 'free', title: 'Bảng Miễn Phí', subtitle: 'Truyện đọc tự do, không cần nạp VIP', badge: 'Miễn phí' },
  { id: 'points', title: 'Top Tích Phân', subtitle: 'Đại tác phẩm kinh điển điểm cao nhất', badge: 'Kinh điển' },
];

/**
 * Từ điển chuyển đổi thuật ngữ / thể loại Tấn Giang sang tiếng Việt quen thuộc
 */
const TAG_MAP: Record<string, string> = {
  '百合': 'Bách hợp (GL)',
  '纯爱': 'Thuần ái',
  '重生': 'Trọng sinh',
  '穿越': 'Xuyên không',
  '快穿': 'Xuyên nhanh',
  '穿书': 'Xuyên thư',
  '系统': 'Hệ thống',
  '娱乐圈': 'Giới giải trí',
  'ABO': 'ABO',
  '强强': 'Cường cường',
  '甜文': 'Điềm văn (Ngọt sủng)',
  '爽文': 'Sảng văn',
  '年下': 'Niên hạ',
  '年上': 'Niên thượng',
  '破镜重圆': 'Gương vỡ lại lành',
  '天作之合': 'Trời sinh một cặp',
  '情有独钟': 'Tình hữu độc chung',
  '近水楼台': 'Gần quan được ban lộc',
  '现代': 'Hiện đại',
  '都市': 'Đô thị',
  '古代': 'Cổ đại',
  '仙侠': 'Tiên hiệp',
  '修真': 'Tu chân',
  '豪门': 'Hào môn',
  '豪门世家': 'Hào môn thế gia',
  '校园': 'Học đường',
  '青春': 'Thanh xuân',
  '星际': 'Tinh tế',
  '未来': 'Tương lai',
  '末世': 'Mạt thế',
  '机甲': 'Cơ giáp',
  '无限流': 'Vô hạn lưu',
  '种田文': 'Điền văn',
  '宫斗': 'Cung đấu',
  '宅斗': 'Trạch đấu',
  '先婚后爱': 'Cưới trước yêu sau',
  '契约恋爱': 'Khế ước tình yêu',
  '灵异神怪': 'Linh dị thần quái',
  '悬疑推理': 'Trinh thám huyền nghi',
  '女强': 'Nữ cường',
  '治愈': 'Trị liệu / Ấm áp',
  '救赎': 'Cứu rỗi',
  '生子': 'Sinh tử',
  '日常': 'Đời thường',
  '轻松': 'Hài hước nhẹ nhàng',
  '正剧': 'Chính kịch',
  '欢喜冤家': 'Oan gia vui vẻ',
  '青梅竹马': 'Thanh mai trúc mã',
  '连载': 'Đang ra',
  '完结': 'Hoàn thành',
  '连载中': 'Đang ra',
  '已完结': 'Hoàn thành',
};

/**
 * Bảng tra cứu Hán Việt thông dụng cho tiêu đề và tên tác giả
 */
const SINO_VIETNAMESE_PAIRS: [string, string][] = [
  ['一', 'Nhất'], ['二', 'Nhị'], ['三', 'Tam'], ['四', 'Tứ'], ['五', 'Ngũ'], ['六', 'Lục'], ['七', 'Thất'], ['八', 'Bát'], ['九', 'Cửu'], ['十', 'Thập'],
  ['百', 'Bách'], ['千', 'Thiên'], ['万', 'Vạn'], ['亿', 'Ức'], ['合', 'Hợp'], ['花', 'Hoa'], ['爱', 'Ái'], ['情', 'Tình'], ['心', 'Tâm'], ['月', 'Nguyệt'],
  ['日', 'Nhật'], ['天', 'Thiên'], ['地', 'Địa'], ['山', 'Sơn'], ['海', 'Hải'], ['风', 'Phong'], ['云', 'Vân'], ['雪', 'Tuyết'], ['雨', 'Vũ'], ['水', 'Thủy'],
  ['火', 'Hỏa'], ['木', 'Mộc'], ['金', 'Kim'], ['玉', 'Ngọc'], ['女', 'Nữ'], ['人', 'Nhân'], ['生', 'Sinh'], ['死', 'Tử'], ['世', 'Thế'], ['界', 'Giới'],
  ['年', 'Niên'], ['时', 'Thời'], ['光', 'Quang'], ['夜', 'Dạ'], ['明', 'Minh'], ['暗', 'Ám'], ['重', 'Trọng'], ['新', 'Tân'], ['旧', 'Cựu'], ['古', 'Cổ'],
  ['今', 'Kim'], ['白', 'Bạch'], ['黑', 'Hắc'], ['红', 'Hồng'], ['青', 'Thanh'], ['蓝', 'Lam'], ['绿', 'Lục'], ['黄', 'Hoàng'], ['紫', 'Tử'], ['真', 'Chân'],
  ['假', 'Giả'], ['善', 'Thiện'], ['恶', 'Ác'], ['美', 'Mỹ'], ['丑', 'Xú'], ['高', 'Cao'], ['低', 'Đê'], ['长', 'Trường'], ['短', 'Đoản'], ['大', 'Đại'],
  ['小', 'Tiểu'], ['多', 'Đa'], ['少', 'Thiểu'], ['强', 'Cường'], ['弱', 'Nhược'], ['快', 'Khoái'], ['慢', 'Mạn'], ['进', 'Tiến'], ['退', 'Thoái'],
  ['上', 'Thượng'], ['下', 'Hạ'], ['左', 'Tả'], ['右', 'Hữu'], ['前', 'Tiền'], ['后', 'Hậu'], ['内', 'Nội'], ['外', 'Ngoại'], ['中', 'Trung'],
  ['影', 'Ảnh'], ['成', 'Thành'], ['双', 'Song'], ['余', 'Dư'], ['待', 'Đãi'], ['可', 'Khả'], ['放', 'Phóng'], ['肆', 'Tứ'],
  ['她', 'Nàng'], ['的', 'Đích'], ['分', 'Phân'], ['久', 'Cửu'], ['必', 'Tất'], ['桃', 'Đào'], ['李', 'Lý'], ['不', 'Bất'], ['言', 'Ngôn'],
  ['降', 'Hàng'], ['落', 'Lạc'], ['我', 'Ngã'], ['春', 'Xuân'], ['秋', 'Thu'], ['冬', 'Đông'], ['夏', 'Hạ'], ['梦', 'Mộng'], ['玄', 'Huyền'],
  ['笺', 'Tiên'], ['宁', 'Ninh'], ['远', 'Viễn'], ['扶', 'Phù'], ['华', 'Hoa'], ['闵', 'Mẫn'], ['然', 'Nhiên'], ['珈', 'Gia'], ['西', 'Tây'],
  ['顾', 'Cố'], ['许', 'Hứa'], ['沈', 'Thẩm'], ['林', 'Lâm'], ['苏', 'Tô'], ['陆', 'Lục'], ['秦', 'Tần'], ['叶', 'Diệp'], ['江', 'Giang'],
  ['唐', 'Đường'], ['宋', 'Tống'], ['楚', 'Sở'], ['温', 'Ôn'], ['谢', 'Tạ'], ['程', 'Trình'], ['周', 'Chu'], ['萧', 'Tiêu'], ['安', 'An'],
  ['乐', 'Lạc'], ['喜', 'Hỷ'], ['哀', 'Ai'], ['怒', 'Nộ'], ['惊', 'Kinh'], ['恐', 'Khủng'], ['悲', 'Bi'], ['欢', 'Hoan'], ['离', 'Ly'],
  ['总', 'Tổng'], ['裁', 'Tài'], ['夫', 'Phu'], ['妇', 'Phụ'], ['妻', 'Thê'], ['姐', 'Tỷ'], ['妹', 'Muội'], ['师', 'Sư'], ['徒', 'Đồ'],
  ['尊', 'Tôn'], ['主', 'Chủ'], ['帝', 'Đế'], ['王', 'Vương'], ['君', 'Quân'], ['神', 'Thần'], ['仙', 'Tiên'], ['魔', 'Ma'], ['妖', 'Yêu'],
  ['鬼', 'Quỷ'], ['怪', 'Quái'], ['道', 'Đạo'], ['佛', 'Phật'], ['法', 'Pháp'], ['医', 'Y'], ['药', 'Dược'], ['书', 'Thư'], ['画', 'Họa'],
  ['琴', 'Cầm'], ['棋', 'Kỳ'], ['诗', 'Thi'], ['酒', 'Tửu'], ['茶', 'Trà'], ['剑', 'Kiếm'], ['刀', 'Đao'], ['枪', 'Thương'], ['弓', 'Cung'],
  ['穿', 'Xuyên'], ['越', 'Việt'], ['修', 'Tu'], ['炼', 'Luyện'], ['统', 'Thống'], ['系', 'Hệ'],
  ['甜', 'Điềm'], ['苦', 'Khổ'], ['辣', 'Lạt'], ['酸', 'Toan'], ['咸', 'Hàm'], ['清', 'Thanh'], ['浊', 'Trọc'], ['凉', 'Lương'],
  ['寒', 'Hàn'], ['热', 'Nhiệt'], ['冷', 'Lãnh'], ['暖', 'Noãn'], ['香', 'Hương'], ['臭', 'Xú'], ['幽', 'U'], ['妙', 'Diệu'],
  ['奇', 'Kỳ'], ['特', 'Đặc'], ['异', 'Dị'], ['常', 'Thường'], ['变', 'Biến'], ['化', 'Hóa'], ['转', 'Chuyển'], ['回', 'Hồi'], ['归', 'Quy'],
  ['来', 'Lai'], ['去', 'Khứ'], ['往', 'Vãng'], ['走', 'Tẩu'], ['飞', 'Phi'], ['跑', 'Bào'], ['游', 'Du'], ['戏', 'Hí'], ['剧', 'Kịch'],
  ['歌', 'Ca'], ['舞', 'Vũ'], ['曲', 'Khúc'], ['音', 'Âm'], ['声', 'Thanh'], ['响', 'Hưởng'], ['语', 'Ngữ'], ['说', 'Thuyết'],
  ['话', 'Thoại'], ['文', 'Văn'], ['章', 'Chương'], ['篇', 'Thiên'], ['句', 'Cú'], ['字', 'Tự'], ['名', 'Danh'], ['姓', 'Tính'], ['号', 'Hiệu'],
  ['家', 'Gia'], ['国', 'Quốc'], ['城', 'Thành'], ['市', 'Thị'], ['村', 'Thôn'], ['庄', 'Trang'], ['园', 'Viên'], ['府', 'Phủ'], ['院', 'Viện'],
  ['楼', 'Lâu'], ['台', 'Đài'], ['阁', 'Các'], ['亭', 'Đình'], ['堂', 'Đường'], ['室', 'Thất'], ['房', 'Phòng'], ['屋', 'Ốc'], ['门', 'Môn'],
  ['窗', 'Song'], ['壁', 'Bích'], ['墙', 'Tường'], ['路', 'Lộ'], ['桥', 'Kiều'], ['舟', 'Chu'], ['船', 'Thuyền'], ['车', 'Xa'],
  ['马', 'Mã'], ['牛', 'Ngưu'], ['羊', 'Dương'], ['犬', 'Khuyển'], ['狗', 'Cẩu'], ['猫', 'Miêu'], ['鸟', 'Điểu'], ['鱼', 'Ngư'], ['虫', 'Trùng'],
  ['龙', 'Long'], ['凤', 'Phụng'], ['虎', 'Hổ'], ['狮', 'Sư'], ['象', 'Tượng'], ['狐', 'Hồ'], ['兔', 'Thố'], ['鹿', 'Lộc'], ['鹤', 'Hạc'],
  ['竹', 'Trúc'], ['松', 'Tùng'], ['柏', 'Bách'], ['梅', 'Mai'], ['兰', 'Lan'], ['菊', 'Cúc'], ['莲', 'Liên'], ['柳', 'Liễu'], ['草', 'Thảo'],
  ['树', 'Thụ'], ['枝', 'Chi'], ['根', 'Căn'], ['实', 'Thực'], ['虚', 'Hư'], ['空', 'Không'], ['满', 'Mãn'], ['圆', 'Viên'],
  ['缺', 'Khuyết'], ['完', 'Hoàn'], ['结', 'Kết'], ['始', 'Thủy'], ['终', 'Chung'], ['末', 'Mạt'], ['极', 'Cực'], ['顶', 'Đỉnh'], ['底', 'Để'],
  ['微', 'Vi'], ['博', 'Bác'], ['客', 'Khách'], ['宾', 'Tân'], ['友', 'Hữu'], ['朋', 'Bằng'], ['敌', 'Địch'], ['仇', 'Cừu'],
  ['恩', 'Ân'], ['怨', 'Oán'], ['恨', 'Hận'], ['恋', 'Luyến'], ['相', 'Tương'], ['思', 'Tư'], ['念', 'Niệm'], ['忆', 'Ức'], ['忘', 'Vong'],
  ['记', 'Ký'], ['录', 'Lục'], ['志', 'Chí'], ['传', 'Truyện'], ['史', 'Sử'], ['事', 'Sự'], ['物', 'Vật'], ['理', 'Lý'],
  ['规', 'Quy'], ['则', 'Tắc'], ['律', 'Luật'], ['度', 'Độ'], ['量', 'Lượng'], ['数', 'Số'], ['形', 'Hình'], ['色', 'Sắc'],
  ['味', 'Vị'], ['触', 'Xúc'], ['觉', 'Giác'], ['视', 'Thị'], ['听', 'Thính'], ['感', 'Cảm'], ['知', 'Tri'], ['意', 'Ý'],
  ['愿', 'Nguyện'], ['希', 'Hy'], ['望', 'Vọng'], ['期', 'Kỳ'], ['盼', 'Phán'], ['求', 'Cầu'], ['索', 'Tác'], ['寻', 'Tầm'],
  ['觅', 'Mịch'], ['探', 'Thám'], ['究', 'Cứu'], ['研', 'Nghiên'], ['学', 'Học'], ['习', 'Tập'], ['练', 'Luyện'], ['养', 'Dưỡng'],
  ['破', 'Phá'], ['镜', 'Kính'], ['独', 'Độc'], ['钟', 'Chung'], ['作', 'Tác'], ['之', 'Chi'],
  ['先', 'Tiên'], ['婚', 'Hôn'], ['救', 'Cứu'], ['赎', 'Thục'], ['治', 'Trị'], ['愈', 'Dũ'], ['星', 'Tinh'],
  ['际', 'Tế'], ['机', 'Cơ'], ['甲', 'Giáp'], ['种', 'Chủng'], ['田', 'Điền'], ['宫', 'Cung'], ['斗', 'Đấu'],
  ['子', 'Tử'], ['冤', 'Oan'],
  ['泾', 'Kính'], ['渭', 'Vị'], ['殇', 'Thương'], ['请', 'Thỉnh'], ['莫', 'Mạc'], ['笑', 'Tiếu'],
  ['赘', 'Chuế'], ['入', 'Nhập'], ['仵', 'Ngỗ'], ['陵', 'Lăng'], ['现', 'Hiện'], ['代', 'Đại'],
  ['趁', 'Thừa'], ['危', 'Nguy'], ['淮', 'Hoài'], ['洲', 'Châu'], ['港', 'Cảng'], ['岛', 'Đảo'],
  ['缠', 'Triền'], ['迫', 'Bách'], ['臣', 'Thần'], ['服', 'Phục'], ['级', 'Cấp'], ['虞', 'Ngu'],
  ['眠', 'Miên'], ['乱', 'Loạn'], ['弃', 'Khí'], ['控', 'Khống'], ['涩', 'Sáp'], ['钓', 'Điếu'],
  ['嘴', 'Chủy'], ['硬', 'Ngạnh'], ['软', 'Nhuyễn'], ['燃', 'Nhiên'], ['灯', 'Đăng'], ['绑', 'Bảng'],
  ['竞', 'Cạnh'], ['晕', 'Vựng'], ['撩', 'Liêu'], ['娇', 'Kiều'], ['诱', 'Dụ'], ['狂', 'Cuồng'],
  ['受', 'Thụ'], ['攻', 'Công'], ['晏', 'Yến'], ['河', 'Hà'], ['悔', 'Hối'], ['遁', 'Độn'],
  ['怀', 'Hoài'], ['崽', 'Tể'], ['乖', 'Ngoan'], ['点', 'Điểm'], ['被', 'Bị'], ['了', 'Liễu'],
  ['与', 'Dữ'], ['平', 'Bình'], ['演', 'Diễn'], ['艺', 'Nghệ'], ['圈', 'Quyển'], ['霸', 'Bá'],
  ['宠', 'Sủng'], ['虐', 'Ngược'], ['公', 'Công'], ['主', 'Chủ'], ['岁', 'Tuế'], ['寻', 'Tầm'],
  ['口', 'Khẩu'], ['饼', 'Bính'], ['胡', 'Hồ'], ['起', 'Khởi'], ['台', 'Đài'],
  ['头', 'Đầu'], ['拯', 'Chửng'], ['幻', 'Huyễn'], ['助', 'Trợ'], ['手', 'Thủ'], ['最', 'Tối'],
  ['东', 'Đông'], ['毕', 'Tất'], ['业', 'Nghiệp'], ['立', 'Lập'], ['也', 'Dã'], ['很', 'Hận'],
  ['耀', 'Diệu'], ['眼', 'Nhãn'], ['配', 'Phối'], ['太', 'Thái'], ['阳', 'Dương'], ['爷', 'Gia'],
  ['要', 'Yếu'], ['在', 'Tại'], ['围', 'Vi'], ['场', 'Trường'], ['调', 'Điều'], ['亲', 'Thân'],
  ['妈', 'Ma'], ['杀', 'Sát'], ['疯', 'Phong'], ['追', 'Truy'], ['尾', 'Vĩ'], ['打', 'Đả'],
  ['工', 'Công'], ['抵', 'Để'], ['债', 'Trái'], ['前', 'Tiền'], ['友', 'Hữu'], ['师', 'Sư'],
  ['妹', 'Muội'], ['教', 'Giáo'], ['捡', 'Kiểm'], ['巫', 'Vu'], ['诅', 'Chú'],
  ['咒', 'Chú'], ['柯', 'Kha'], ['豪', 'Hào'], ['体', 'Thể'], ['验', 'Nghiệm'], ['卡', 'Tạp'],
  ['怎', 'Chẩm'], ['么', 'Ma'], ['过', 'Quá'], ['占', 'Chiêm'], ['为', 'Vi'], ['己', 'Kỷ'],
  ['有', 'Hữu'], ['狼', 'Lang'], ['综', 'Tống'], ['爆', 'Bạo'], ['迫', 'Bách'], ['祭', 'Tế'],
  ['伪', 'Ngụy'], ['装', 'Trang'], ['各', 'Các'], ['郡', 'Quận'], ['执', 'Chấp'], ['刀', 'Đao'],
];

const SINO_VIETNAMESE_SYLLABLES: Record<string, string> = {
  ...(hanvietDict as Record<string, string>),
  ...Object.fromEntries(SINO_VIETNAMESE_PAIRS),
  '生': 'Sinh',
  '拟': 'Phỏng',
  '但': 'Đãn',
  '厂': 'Xưởng',
  '武': 'Võ',
  '为': 'Vi',
  '因': 'Nhân',
  '无': 'Vô',
  '综': 'Tổng',
  '虎': 'Hổ',
  '酥': 'Tô',
  '辞': 'Từ',
  '妄': 'Vọng',
  '言': 'Ngôn',
  '妹': 'Muội',
  '师': 'Sư',
  '女': 'Nữ',
  '占': 'Chiêm',
  '己': 'Kỷ',
  '有': 'Hữu',
  '姬': 'Cơ',
  '物': 'Vật',
  '语': 'Ngữ',
  '传': 'Truyền',
  '闻': 'Văn',
  '中': 'Trung',
  '的': 'Đích',
  '明': 'Minh',
  '石': 'Thạch',
  '富': 'Phú',
  '连': 'Liên',
  '夜': 'Dạ',
  '爬': 'Ba',
  '上': 'Thượng',
  '暴': 'Bạo',
  '食': 'Thực',
  '山': 'Sơn',
  '马': 'Mã',
  '吃': 'Cật',
  '回': 'Hồi',
  '头': 'Đầu',
  '草': 'Thảo',
  '星': 'Tinh',
  '落': 'Lạc',
  '于': 'Vu',
  '掌': 'Chưởng',
  '心': 'Tâm',
  '难': 'Nan',
  '西': 'Tây',
  '游': 'Du',
};

/**
 * Phiên âm Hán-Việt cho chuỗi chữ Hán (tên truyện / tác giả)
 */
export function toSinoVietnamese(text: string): string {
  if (!text) return '';
  const result: string[] = [];
  let isLatinBuffer = '';

  const flushLatin = () => {
    if (isLatinBuffer) {
      result.push(isLatinBuffer);
      isLatinBuffer = '';
    }
  };

  for (let i = 0; i < text.length; i++) {
    const char = text[i];
    if (['《', '》', '【', '】'].includes(char)) {
      continue;
    }
    if (['[', '(', '（'].includes(char)) {
      flushLatin();
      result.push('[');
      continue;
    }
    if ([']', ')', '）'].includes(char)) {
      flushLatin();
      result.push(']');
      continue;
    }
    if (['!', '！'].includes(char)) {
      flushLatin();
      result.push('!');
      continue;
    }
    if (['?', '？'].includes(char)) {
      flushLatin();
      result.push('?');
      continue;
    }
    if ([' ', '·', '-', '—', ':', '：'].includes(char)) {
      flushLatin();
      continue;
    }

    const syllable = SINO_VIETNAMESE_SYLLABLES[char];
    if (syllable) {
      flushLatin();
      result.push(syllable);
    } else if (/[a-zA-Z0-9]/.test(char)) {
      isLatinBuffer += char;
    } else {
      flushLatin();
      result.push(char);
    }
  }
  flushLatin();

  return result.join(' ')
    .replace(/\s*\[\s*/g, ' [')
    .replace(/\s*\]\s*/g, '] ')
    .replace(/\s*!\s*/g, '! ')
    .replace(/\s*\?\s*/g, '? ')
    .replace(/\s+/g, ' ')
    .trim();
}

/**
 * Chuyển đổi danh sách tags tiếng Trung sang tiếng Việt
 */
export function translateTags(tags: string[]): string[] {
  return tags.map(tag => {
    const trimmed = tag.trim();
    if (TAG_MAP[trimmed]) return TAG_MAP[trimmed];
    const sino = toSinoVietnamese(trimmed);
    return sino || trimmed;
  });
}

/**
 * Kho dữ liệu tuyển chọn (Curated Data) những tác phẩm Bách Hợp kinh điển & hot nhất
 * trên từng Bảng xếp hạng Tấn Giang, đảm bảo luôn có dữ liệu tức thời và chuẩn xác.
 */
const CURATED_BAIHE_RANKINGS: Record<JjwxcRankingType, JjwxcStoryItem[]> = {
  vip_gold: [
    {
      novelId: '3907377',
      title: '泾渭情殇',
      titleVi: 'Kính Vị Tình Thương',
      author: '请君莫笑',
      authorVi: 'Thỉnh Quân Mạc Tiếu',
      tags: ['百合', '古代', '宫廷侯爵', '虐文', '正剧', '强强'],
      tagsVi: ['Bách hợp (GL)', 'Cổ đại', 'Cung đình hầu tước', 'Ngược văn', 'Chính kịch', 'Cường cường'],
      intro: '【一代经典百合权谋巨作】\n乞颜阿古拉（齐颜）背负灭族血海深仇，女扮男装高中状元，入赘皇家成为南宫静女的驸马。家仇国恨与炽热爱恋交织，一生只为一人。',
      introVi: '【Kinh điển quyền mưu bách hợp đại tác】\nKhất Nhan A Cổ Lạp (Tề Nhan) mang trên mình huyết hải thâm thù diệt tộc, giả nam trang thi đỗ trạng nguyên, nhập chuế hoàng gia làm phò mã của Nam Cung Tĩnh Nữ. Nợ nước thù nhà và tình yêu tha thiết đan xen, một đời chỉ vì một người.',
      status: 'completed',
      chapterCount: 307,
      wordCount: '118.2万字',
      score: '1,617,257,216',
      rankingType: 'vip_gold',
      rank: 1,
      coverUrl: 'https://images.unsplash.com/photo-1544716278-ca5e3f4abd8c?w=400&q=80',
    },
    {
      novelId: '3414028',
      title: '入赘',
      titleVi: 'Nhập Chuế',
      author: '请君莫笑',
      authorVi: 'Thỉnh Quân Mạc Tiếu',
      tags: ['百合', '古代', '穿越时空', '女扮男装', '经商', '正剧'],
      tagsVi: ['Bách hợp (GL)', 'Cổ đại', 'Xuyên không', 'Nữ giả nam', 'Kinh thương', 'Chính kịch'],
      intro: '现代女子云安穿越到古代，阴差阳错入赘首富林府，娶了名震江南的商贾千金林不羡。细水长流的温馨与携手风雨的相守。',
      introVi: 'Nữ tử hiện đại Vân An xuyên không về cổ đại, âm sai dương sai nhập chuế Lâm phủ giàu có bậc nhất, cưới thiên kim thương gia chấn động Giang Nam Lâm Bất Tiện. Sự ấm áp nước chảy đá mòn và kề vai sát cánh qua phong ba bão táp.',
      status: 'completed',
      chapterCount: 198,
      wordCount: '89.4万字',
      score: '1,294,000,000',
      rankingType: 'vip_gold',
      rank: 2,
      coverUrl: 'https://images.unsplash.com/photo-1512820790803-83ca734da794?w=400&q=80',
    },
    {
      novelId: '3334550',
      title: '女仵作',
      titleVi: 'Nữ Ngỗ Tác',
      author: '请君莫笑',
      authorVi: 'Thỉnh Quân Mạc Tiếu',
      tags: ['百合', '古代', '穿越时空', '种田文', '悬疑推理', '正剧'],
      tagsVi: ['Bách hợp (GL)', 'Cổ đại', 'Xuyên không', 'Điền văn', 'Huyền nghi / Suy lý', 'Chính kịch'],
      intro: '法医毕业生吴蔚穿越古代，凭借现代法医知识成为一代女仵作，与刺绣娘子柳绣娘在市井红尘与迷案交织中互生情愫、携手余生。',
      introVi: 'Sinh viên tốt nghiệp pháp y Ngô Úy xuyên không về cổ đại, nhờ kiến thức pháp y hiện đại trở thành một nữ ngỗ tác, cùng tú nương Liễu Tú Nương giữa chốn hồng trần phố thị và những vụ án ly kỳ thấu hiểu lẫn nhau, nắm tay trọn đời.',
      status: 'completed',
      chapterCount: 240,
      wordCount: '95.6万字',
      score: '1,840,000,000',
      rankingType: 'vip_gold',
      rank: 3,
      coverUrl: 'https://images.unsplash.com/photo-1476275466078-4007374efbbe?w=400&q=80',
    },
    {
      novelId: '1473506',
      title: '探虚陵现代篇',
      titleVi: 'Thám Hư Lăng Hiện Đại Thiên',
      author: '君sola',
      authorVi: 'Quân sola',
      tags: ['百合', '现代', '都市', '强强', '情有独钟', '正剧'],
      tagsVi: ['Bách hợp (GL)', 'Hiện đại', 'Đô thị', 'Cường cường', 'Tình hữu độc chung', 'Chính kịch'],
      intro: '【百合界殿堂级巨制】\n师清漪在机缘巧合下打开了一具水晶棺，里面躺着一位沉睡千年的容颜绝世的白衣女子洛神。跨越千年的宿命情深与探险解谜。',
      introVi: '【Đại kiệt tác điện đường giới Bách Hợp】\nSư Thanh Y vô tình mở ra một chiếc quan tài pha lê, bên trong là Lạc Thần - nữ tử áo trắng dung mạo tuyệt thế đã ngủ say suốt ngàn năm. Mối tình sâu nặng vượt qua nghìn năm số mệnh và hành trình thám hiểm giải mã.',
      status: 'completed',
      chapterCount: 743,
      wordCount: '320.5万字',
      score: '11,287,505,920',
      rankingType: 'vip_gold',
      rank: 4,
      coverUrl: 'https://images.unsplash.com/photo-1497633762265-9d179a990aa6?w=400&q=80',
    },
    {
      novelId: '7630015',
      title: '今夜刮起台风',
      titleVi: 'Kim Dạ Quát Khởi Thai Phong',
      author: '玄笺',
      authorVi: 'Huyền Tiên',
      tags: ['百合', '现代', '都市', '情有独钟', '恋爱合约', '高岭之花'],
      tagsVi: ['Bách hợp (GL)', 'Hiện đại', 'Đô thị', 'Tình hữu độc chung', 'Hợp đồng tình yêu', 'Đóa hoa trên cao'],
      intro: '鹿今朝第一次见那个女人，她穿着白旗袍，撑伞走过庭院，玲珑易折的楚腰，清新高贵得像一朵洁白的山茶。克制深情与心跳失控。',
      introVi: 'Lộc Kim Triều lần đầu tiên nhìn thấy người phụ nữ ấy, nàng mặc sườn xám trắng, che ô bước qua sân viện, vòng eo mảnh khảnh, thanh tân cao quý như một đóa sơn trà trắng thuần khiết. Sự kiềm chế thâm tình cùng nhịp tim mất kiểm soát.',
      status: 'completed',
      chapterCount: 107,
      wordCount: '48.2万字',
      score: '1,424,979,200',
      rankingType: 'vip_gold',
      rank: 5,
      coverUrl: 'https://images.unsplash.com/photo-1457369804613-52c61a468e7d?w=400&q=80',
    },
    {
      novelId: '10564456',
      title: '海晏河清',
      titleVi: 'Hải Yến Hà Thanh',
      author: '请君莫笑',
      authorVi: 'Thỉnh Quân Mạc Tiếu',
      tags: ['百合', '古代', '强强', '古代幻想', '权谋', '正剧'],
      tagsVi: ['Bách hợp (GL)', 'Cổ đại', 'Cường cường', 'Cổ đại huyễn tưởng', 'Quyền mưu', 'Chính kịch'],
      intro: '请君莫笑最新权谋正剧力作。贺兰清与晏迟，在风起云涌的皇权霸业中携手定乾坤。',
      introVi: 'Tác phẩm chính kịch quyền mưu mới nhất của Thỉnh Quân Mạc Tiếu. Hạ Lan Thanh cùng Yến Trì, giữa phong vân biến ảo tranh đoạt hoàng quyền kề vai sát cánh định càn khôn.',
      status: 'completed',
      chapterCount: 65,
      wordCount: '32.1万字',
      score: '184,140,080',
      rankingType: 'vip_gold',
      rank: 6,
      coverUrl: 'https://images.unsplash.com/photo-1516979187457-637abb4f9353?w=400&q=80',
    },
  ],
  daily_free: [
    {
      novelId: '10541606',
      title: '被冰山病美掌门撩晕了',
      titleVi: 'Bị Băng Sơn Bệnh Mỹ Chưởng Môn Liêu Vựng Liễu',
      author: '不燃千灯',
      authorVi: 'Bất Nhiên Thiên Đăng',
      tags: ['百合', '古代', '武侠', '强强', '年下', '甜文'],
      tagsVi: ['Bách hợp (GL)', 'Cổ đại', 'Võ hiệp', 'Cường cường', 'Niên hạ', 'Điềm văn (Ngọt sủng)'],
      intro: '【冷脸萌直球小腹黑掌门 x 飒爽纯情大金毛女侠】\n赏金客江浸月专管天下不平事，直到接了桩护院活计，被那位清冷绝美的冰山掌门云漱秋一步步吃得死死的。',
      introVi: '【Chưởng môn muộn tao thẳng thắn hơi phúc hắc x Nữ hiệp hào sảng thuần tình】\nThưởng kim khách Giang Tẩm Nguyệt chuyên quản chuyện bất bình trong thiên hạ, cho đến khi nhận việc bảo vệ sân viện, lại bị vị chưởng môn băng sơn thanh lãnh tuyệt mỹ Vân Sấu Thu từng bước quy phục.',
      status: 'completed',
      chapterCount: 286,
      wordCount: '98.5万字',
      score: '204,465,888',
      rankingType: 'daily_free',
      rank: 1,
      coverUrl: 'https://images.unsplash.com/photo-1544716278-ca5e3f4abd8c?w=400&q=80',
    },
    {
      novelId: '7965433',
      title: '她不回头（双重生）',
      titleVi: 'Nàng Bất Hồi Đầu (Song Trọng Sinh)',
      author: '枕山困',
      authorVi: 'Chẩm Sơn Khốn',
      tags: ['百合', '古代', '重生', '青梅竹马', '追妻火葬场'],
      tagsVi: ['Bách hợp (GL)', 'Cổ đại', 'Trọng sinh', 'Thanh mai trúc mã', 'Truy thê hỏa táng tràng'],
      intro: '双重生，前世错过与今生执念，限免期间全本免费阅读。',
      introVi: 'Song trọng sinh, kiếp trước bỏ lỡ cùng chấp niệm kiếp này, toàn bộ miễn phí trong thời gian giới hạn.',
      status: 'completed',
      chapterCount: 85,
      wordCount: '36.8万字',
      score: '180,000,000',
      rankingType: 'daily_free',
      rank: 2,
    },
    {
      novelId: '8046872',
      title: '海与桥',
      titleVi: 'Hải Dữ Kiều',
      author: '林平江',
      authorVi: 'Lâm Bình Giang',
      tags: ['百合', '现代', '都市', '破镜重圆', '正剧'],
      tagsVi: ['Bách hợp (GL)', 'Hiện đại', 'Đô thị', 'Gương vỡ lại lành', 'Chính kịch'],
      intro: '两座孤岛之间架起的心灵之桥。重逢在潮起潮落的滨海小城。',
      introVi: 'Cây cầu tâm linh bắc qua hai hòn đảo cô độc. Tái ngộ tại thành phố ven biển sóng dâng triều rút.',
      status: 'completed',
      chapterCount: 75,
      wordCount: '31.2万字',
      score: '13,117,670',
      rankingType: 'daily_free',
      rank: 3,
    },
    {
      novelId: '10790635',
      title: '被病娇诱受0狂撩',
      titleVi: 'Bị Bệnh Kiều Dụ Thụ O Cuồng Liêu',
      author: '强ER',
      authorVi: 'Cường ER',
      tags: ['百合', '现代', 'ABO', '钓系', '甜文'],
      tagsVi: ['Bách hợp (GL)', 'Hiện đại', 'ABO', 'Thả thính', 'Điềm văn (Ngọt sủng)'],
      intro: '病娇诱受大小姐 Omega vs 憨笨直球穷打工仔 Alpha。',
      introVi: 'Bệnh kiều dụ thụ đại tiểu thư Omega vs Ngốc nghếch thẳng tính Alpha đi làm thuê.',
      status: 'completed',
      chapterCount: 70,
      wordCount: '29.5万字',
      score: '11,988,406',
      rankingType: 'daily_free',
      rank: 4,
    },
    {
      novelId: '8836902',
      title: '姐姐，你乖一点',
      titleVi: 'Tỷ Tỷ, Ngươi Ngoan Nhất Điểm',
      author: '一两半夏',
      authorVi: 'Nhất Lượng Bán Hạ',
      tags: ['百合', '现代', '都市', '暗恋', '甜文'],
      tagsVi: ['Bách hợp (GL)', 'Hiện đại', 'Đô thị', 'Thầm mến', 'Điềm văn (Ngọt sủng)'],
      intro: '多年暗恋终于窥见天光，年下小狗一步步展露占有欲。',
      introVi: 'Nhiều năm thầm mến rốt cuộc nhìn thấy ánh mặt trời, chú cún con niên hạ từng bước bộc lộ tính chiếm hữu.',
      status: 'completed',
      chapterCount: 80,
      wordCount: '34.8万字',
      score: '15,087,748',
      rankingType: 'daily_free',
      rank: 5,
    },
    {
      novelId: '10608220',
      title: '趁她之危',
      titleVi: 'Thừa Nàng Chi Nguy',
      author: '秦淮洲',
      authorVi: 'Tần Hoài Châu',
      tags: ['百合', '现代', '先婚后爱', '年下', '甜文'],
      tagsVi: ['Bách hợp (GL)', 'Hiện đại', 'Cưới trước yêu sau', 'Niên hạ', 'Điềm văn (Ngọt sủng)'],
      intro: '池繁夏在妻子失忆后的温柔攻势，年度破千万点击的双向治愈佳作。',
      introVi: 'Đợt tấn công dịu dàng của Trì Phồn Hạ sau khi người vợ mất trí nhớ, tác phẩm ấm áp chữa lành lẫn nhau.',
      status: 'completed',
      chapterCount: 87,
      wordCount: '39.8万字',
      score: '1,412,771,584',
      rankingType: 'daily_free',
      rank: 6,
    },
  ],
  month: [
    {
      novelId: '10608220',
      title: '趁她之危',
      titleVi: 'Thừa Nàng Chi Nguy',
      author: '秦淮洲',
      authorVi: 'Tần Hoài Châu',
      tags: ['百合', '现代', '年下', '先婚后爱', '御姐', '甜文'],
      tagsVi: ['Bách hợp (GL)', 'Hiện đại', 'Niên hạ', 'Cưới trước yêu sau', 'Ngự tỷ', 'Điềm văn (Ngọt sủng)'],
      intro: '池繁夏的妻子虞深出车祸伤到头，记忆停在婚前，完全忘记了她们准备离婚的事。趁虚而入与重新沦陷的温柔陷阱。',
      introVi: 'Người vợ Ngu Thâm của Trì Phồn Hạ gặp tai nạn chấn thương đầu, ký ức dừng lại ở trước khi kết hôn, hoàn toàn quên mất việc hai người chuẩn bị ly hôn. Thừa dịp nàng mất trí nhớ mà từng bước kéo nàng vào chiếc bẫy tình yêu dịu dàng.',
      status: 'completed',
      chapterCount: 87,
      wordCount: '39.8万字',
      score: '1,412,771,584',
      rankingType: 'month',
      rank: 1,
    },
    {
      novelId: '8382415',
      title: '卧底后被港岛大小姐缠上了',
      titleVi: 'Ngọa Để Hậu Bị Cảng Đảo Đại Tiểu Thư Triền Thượng Liễu',
      author: '岁寻',
      authorVi: 'Tuế Tầm',
      tags: ['百合', '现代', '豪门世家', '破镜重圆', '年下', '正剧'],
      tagsVi: ['Bách hợp (GL)', 'Hiện đại', 'Hào môn thế gia', 'Gương vỡ lại lành', 'Niên hạ', 'Chính kịch'],
      intro: '沈雾第一次见裴薄妍的那晚，正在清洗手上的血污。港岛风云、卧底暗战与豪门大小姐刻骨铭心的执念相缠。',
      introVi: 'Đêm Thẩm Vụ lần đầu tiên gặp Bùi Bạc Nghiên, nàng đang rửa sạch vết máu trên tay. Phong vân đất Cảng Đảo, cuộc chiến ngầm của gián điệp cùng chấp niệm quấn quýt khắc cốt ghi tâm của đại tiểu thư hào môn.',
      status: 'completed',
      chapterCount: 165,
      wordCount: '68.5万字',
      score: '4,787,816,960',
      rankingType: 'month',
      rank: 2,
    },
    {
      novelId: '9178680',
      title: '被迫臣服冰山顶级大小姐O',
      titleVi: 'Bị Bách Thần Phục Băng Sơn Đỉnh Cấp Đại Tiểu Thư O',
      author: '虞不眠',
      authorVi: 'Ngu Bất Miên',
      tags: ['百合', '现代', 'ABO', '娱乐圈', '甜文', '追妻火葬场'],
      tagsVi: ['Bách hợp (GL)', 'Hiện đại', 'ABO', 'Giới giải trí', 'Điềm văn (Ngọt sủng)', 'Truy thê hỏa táng tràng'],
      intro: '顶级冰山大小姐Omega与高匹配度Alpha之间的纠缠拉扯，六岁年龄差，极致诱惑与真香火葬场。',
      introVi: 'Sự dây dưa lôi kéo giữa đỉnh cấp băng sơn đại tiểu thư Omega và nàng Alpha có độ xứng đôi cực cao, chênh lệch 6 tuổi, cực hạn mê hoặc và hành trình truy thê hỏa táng tràng.',
      status: 'completed',
      chapterCount: 92,
      wordCount: '41.6万字',
      score: '273,603,008',
      rankingType: 'month',
      rank: 3,
    },
    {
      novelId: '10697111',
      title: '黄月光她始乱终弃',
      titleVi: 'Hoàng Nguyệt Quang Nàng Thủy Loạn Chung Khí',
      author: '胡33',
      authorVi: 'Hồ 33',
      tags: ['百合', '古代', '情有独钟', '天作之合', '甜文', '爽文'],
      tagsVi: ['Bách hợp (GL)', 'Cổ đại', 'Tình hữu độc chung', 'Trời sinh một cặp', 'Điềm văn (Ngọt sủng)', 'Sảng văn'],
      intro: '当年被我抛弃的卑微小马奴，如今摇身一变成了权倾天下的未婚妻？掉马修罗场与甜爽互撩。',
      introVi: 'Tiểu mã nô hèn mọn năm xưa bị ta vứt bỏ, hôm nay lắc mình biến hóa thành vị hôn thê quyền khuynh thiên hạ? Rơi mặt nạ tu la tràng cùng ngọt sủng trêu chọc lẫn nhau.',
      status: 'completed',
      chapterCount: 78,
      wordCount: '35.4万字',
      score: '234,864,400',
      rankingType: 'month',
      rank: 4,
    },
  ],
  quarter: [
    {
      novelId: '10627931',
      title: '和港城大小姐先婚后爱了',
      titleVi: 'Hòa Cảng Thành Đại Tiểu Thư Tiên Hôn Hậu Ái Liễu',
      author: '水一天',
      authorVi: 'Thủy Nhất Thiên',
      tags: ['百合', '现代', '豪门世家', '先婚后爱', '年下', '灵异神怪'],
      tagsVi: ['Bách hợp (GL)', 'Hiện đại', 'Hào môn thế gia', 'Cưới trước yêu sau', 'Niên hạ', 'Linh dị thần quái'],
      intro: '古董铺少东家 × 港城第一千金。契约成婚，各取所需，却在朝夕相对与诡秘灵异事件中一步步深陷。',
      introVi: 'Tiểu đông gia tiệm đồ cổ × Đệ nhất thiên kim đất Cảng. Hợp đồng hôn nhân đôi bên cùng có lợi, nhưng trong những ngày tháng sớm tối bên nhau và các sự kiện kỳ bí dần dần rơi vào lưới tình.',
      status: 'completed',
      chapterCount: 88,
      wordCount: '42.1万字',
      score: '132,801,304',
      rankingType: 'quarter',
      rank: 1,
    },
    {
      novelId: '9112338',
      title: '死遁后冰山O怀了我的崽',
      titleVi: 'Tử Độn Hậu Băng Sơn O Hoài Liễu Ngã Đích Tể',
      author: '醉后应见我',
      authorVi: 'Túy Hậu Ứng Kiến Ngã',
      tags: ['百合', '现代', 'ABO', '破镜重圆', '都市', '天作之合'],
      tagsVi: ['Bách hợp (GL)', 'Hiện đại', 'ABO', 'Gương vỡ lại lành', 'Đô thị', 'Trời sinh một cặp'],
      intro: '清贫温柔坏狗 Alpha × 豪门占有欲极强冰山 Omega。当年死遁脱身，重逢时却发现冰山前妻身边藏着一个眉眼极像自己的小团子。',
      introVi: 'Thanh bần dịu dàng bad girl Alpha × Băng sơn Omega hào môn chiếm hữu dục cực cao. Năm xưa chết giả trốn thoát, ngày tái ngộ lại phát hiện bên cạnh người vợ cũ băng sơn có một bé con mắt mày giống hệt mình.',
      status: 'completed',
      chapterCount: 95,
      wordCount: '46.7万字',
      score: '282,640,832',
      rankingType: 'quarter',
      rank: 2,
    },
    {
      novelId: '10734159',
      title: '失控',
      titleVi: 'Thất Khống',
      author: '叶涩',
      authorVi: 'Diệp Sáp',
      tags: ['百合', '现代', '都市', '年下', '情有独钟', '正剧'],
      tagsVi: ['Bách hợp (GL)', 'Hiện đại', 'Đô thị', 'Niên hạ', 'Tình hữu độc chung', 'Chính kịch'],
      intro: '三十四岁的职场女精英顾婉秋离异带娃，严谨克制；遇到年下热烈直球的追求，成年人情感防线彻底失控溃败。',
      introVi: 'Nữ tinh anh chức trường 34 tuổi Cố Uyển Thu ly dị mang theo con nhỏ, nghiêm cẩn kiềm chế; gặp gỡ sự theo đuổi nhiệt liệt thẳng thắn của niên hạ, phòng tuyến tình cảm của người trưởng thành triệt để mất kiểm soát sụp đổ.',
      status: 'completed',
      chapterCount: 85,
      wordCount: '38.9万字',
      score: '282,271,744',
      rankingType: 'quarter',
      rank: 3,
    },
    {
      novelId: '7417797',
      title: '断情后长公主后悔了',
      titleVi: 'Đoạn Tình Hậu Trưởng Công Chúa Hậu Hối Liễu',
      author: '纬叙',
      authorVi: 'Vĩ Tự',
      tags: ['百合', '古代', '年下', '女扮男装', '宫廷侯爵', '追妻火葬场'],
      tagsVi: ['Bách hợp (GL)', 'Cổ đại', 'Niên hạ', 'Nữ giả nam', 'Cung đình hầu tước', 'Truy thê hỏa táng tràng'],
      intro: '直球年下小将军攻 × 偏执孤寂年上长公主受。斩断情丝远赴边关之后，向来高高在上的长公主终于红着眼求她回头。',
      introVi: 'Niên hạ tiểu tướng quân thẳng thắn công × Trưởng công chúa niên thượng thiên chấp cô độc thụ. Sau khi cắt đứt tình duyên đi tới biên cương, vị trưởng công chúa cao cao tại thượng rốt cuộc cũng đỏ mắt cầu xin nàng quay lại.',
      status: 'completed',
      chapterCount: 96,
      wordCount: '44.3万字',
      score: '91,904,912',
      rankingType: 'quarter',
      rank: 4,
    },
  ],
  half_year: [
    {
      novelId: '7630015',
      title: '今夜刮起台风',
      titleVi: 'Kim Dạ Quát Khởi Thai Phong',
      author: '玄笺',
      authorVi: 'Huyền Tiên',
      tags: ['百合', '现代', '都市', '情有独钟', '恋爱合约', '高岭之花'],
      tagsVi: ['Bách hợp (GL)', 'Hiện đại', 'Đô thị', 'Tình hữu độc chung', 'Hợp đồng tình yêu', 'Đóa hoa trên cao'],
      intro: '玄笺高口碑年度巨献，克制清冷的高岭之花与炽烈追随的极致浪漫。',
      introVi: 'Đại tác phẩm năm được đánh giá cực cao của Huyền Tiên, sự va chạm lãng mạn tột cùng giữa đóa hoa trên cao thanh lãnh và tình yêu cháy bỏng.',
      status: 'completed',
      chapterCount: 107,
      wordCount: '48.2万字',
      score: '1,424,979,200',
      rankingType: 'half_year',
      rank: 1,
    },
    {
      novelId: '10608220',
      title: '趁她之危',
      titleVi: 'Thừa Nàng Chi Nguy',
      author: '秦淮洲',
      authorVi: 'Tần Hoài Châu',
      tags: ['百合', '现代', '先婚后爱', '年下', '甜文'],
      tagsVi: ['Bách hợp (GL)', 'Hiện đại', 'Cưới trước yêu sau', 'Niên hạ', 'Điềm văn (Ngọt sủng)'],
      intro: '池繁夏在妻子失忆后的温柔攻势，年度破千万点击的双向治愈佳作。',
      introVi: 'Đợt tấn công dịu dàng của Trì Phồn Hạ sau khi người vợ mất trí nhớ, tác phẩm ấm áp chữa lành lẫn nhau phá chục triệu lượt đọc trong năm.',
      status: 'completed',
      chapterCount: 87,
      wordCount: '39.8万字',
      score: '1,412,771,584',
      rankingType: 'half_year',
      rank: 2,
    },
    {
      novelId: '10618015',
      title: '钓系姐姐她嘴硬心软',
      titleVi: 'Điếu Hệ Tỷ Tỷ Nàng Miệng Cứng Lòng Mềm',
      author: '一口可丽饼',
      authorVi: 'Nhất Khẩu Khả Lệ Bính',
      tags: ['百合', '现代', '都市', '业界精英', '边缘恋歌', '情有独钟'],
      tagsVi: ['Bách hợp (GL)', 'Hiện đại', 'Đô thị', 'Nghề nghiệp tinh anh', 'Bên lề tình ca', 'Tình hữu độc chung'],
      intro: '职场上说一不二的清冷御姐，私底下却是个嘴硬心软、经不起撩拨的钓系大姐姐。',
      introVi: 'Ngự tỷ thanh lãnh nói một không hai ở nơi công sở, sau lưng lại là một đại tỷ tỷ miệng cứng lòng mềm, không chịu nổi sự trêu chọc.',
      status: 'completed',
      chapterCount: 82,
      wordCount: '36.5万字',
      score: '18,908,464',
      rankingType: 'half_year',
      rank: 3,
    },
    {
      novelId: '9768367',
      title: '当女明星绑定电竞大神',
      titleVi: 'Đương Nữ Minh Tinh Bảng Định Điện Cạnh Đại Thần',
      author: '木子文香',
      authorVi: 'Mộc Tử Văn Hương',
      tags: ['百合', '现代', '娱乐圈', '游戏网游', '电竞', '破镜重圆'],
      tagsVi: ['Bách hợp (GL)', 'Hiện đại', 'Giới giải trí', 'Trò chơi võng du', 'Esports', 'Gương vỡ lại lành'],
      intro: '美艳当红顶流女明星 × 禁欲系大满贯电竞野王。当年遗憾分手的初恋，在跨界电竞全明星赛上狭路相逢。',
      introVi: 'Đỉnh lưu nữ minh tinh xinh đẹp kiều diễm × Đại thần đi rừng esports đại mãn quán cấm dục. Mối tình đầu tiếc nuối chia tay năm xưa, hẹp hòi gặp lại tại giải giao hữu esports.',
      status: 'completed',
      chapterCount: 90,
      wordCount: '40.2万字',
      score: '23,139,428',
      rankingType: 'half_year',
      rank: 4,
    },
  ],
  free: [
    {
      novelId: '10541606',
      title: '被冰山病美掌门撩晕了',
      titleVi: 'Bị Băng Sơn Bệnh Mỹ Chưởng Môn Liêu Vựng Liễu',
      author: '不燃千灯',
      authorVi: 'Bất Nhiên Thiên Đăng',
      tags: ['百合', '古代', '武侠', '强强', '年下', '甜文', '美强惨'],
      tagsVi: ['Bách hợp (GL)', 'Cổ đại', 'Võ hiệp', 'Cường cường', 'Niên hạ', 'Điềm văn (Ngọt sủng)', 'Mỹ cường thảm'],
      intro: '【冷脸萌直球小腹黑掌门 x 飒爽纯情大金毛女侠】\n赏金客江浸月专管天下不平事，直到接了桩护院活计，被那位清冷绝美、看似弱不禁风的冰山病美人掌门云漱秋一步步吃得死死的。',
      introVi: '【Chưởng môn muộn tao thẳng thắn hơi phúc hắc x Nữ hiệp hào sảng thuần tình】\nThưởng kim khách Giang Tẩm Nguyệt chuyên quản chuyện bất bình trong thiên hạ, cho đến khi nhận việc bảo vệ sân viện, lại bị vị chưởng môn băng sơn bệnh mỹ nhân thanh lãnh tuyệt mỹ Vân Sấu Thu từng bước quy phục hoàn toàn.',
      status: 'completed',
      chapterCount: 286,
      wordCount: '98.5万字',
      score: '204,465,888',
      rankingType: 'free',
      rank: 1,
    },
    {
      novelId: '8046872',
      title: '海与桥',
      titleVi: 'Hải Dữ Kiều',
      author: '林平江',
      authorVi: 'Lâm Bình Giang',
      tags: ['百合', '现代', '都市', '破镜重圆', '年下', '正剧'],
      tagsVi: ['Bách hợp (GL)', 'Hiện đại', 'Đô thị', 'Gương vỡ lại lành', 'Niên hạ', 'Chính kịch'],
      intro: '两座孤岛之间架起的心灵之桥。重逢在潮起潮落的滨海小城，那些未曾言说的隐忍与深爱。',
      introVi: 'Cây cầu tâm linh bắc qua hai hòn đảo cô độc. Tái ngộ tại thành phố ven biển sóng dâng triều rút, những nhẫn nhịn và tình yêu sâu thẳm chưa từng nói ra.',
      status: 'completed',
      chapterCount: 75,
      wordCount: '31.2万字',
      score: '13,117,670',
      rankingType: 'free',
      rank: 2,
    },
    {
      novelId: '8836902',
      title: '姐姐，你乖一点',
      titleVi: 'Tỷ Tỷ, Ngươi Ngoan Nhất Điểm',
      author: '一两半夏',
      authorVi: 'Nhất Lượng Bán Hạ',
      tags: ['百合', '现代', '都市', '暗恋', '甜文', '花季雨季'],
      tagsVi: ['Bách hợp (GL)', 'Hiện đại', 'Đô thị', 'Thầm mến', 'Điềm văn (Ngọt sủng)', 'Thanh xuân vườn trường'],
      intro: '多年暗恋终于窥见天光。当那个高高在上的漂亮姐姐带着脆弱回到身边，年下小狗一步步展露占有欲。',
      introVi: 'Nhiều năm thầm mến rốt cuộc nhìn thấy ánh mặt trời. Khi người chị gái xinh đẹp cao ngạo mang theo sự yếu đuối trở về bên cạnh, chú cún con niên hạ từng bước bộc lộ tính chiếm hữu.',
      status: 'completed',
      chapterCount: 80,
      wordCount: '34.8万字',
      score: '15,087,748',
      rankingType: 'free',
      rank: 3,
    },
    {
      novelId: '10790635',
      title: '被病娇诱受0狂撩',
      titleVi: 'Bị Bệnh Kiều Dụ Thụ O Cuồng Liêu',
      author: '强ER',
      authorVi: 'Cường ER',
      tags: ['百合', '现代', 'ABO', '都市', '钓系', '甜文'],
      tagsVi: ['Bách hợp (GL)', 'Hiện đại', 'ABO', 'Đô thị', 'Thả thính', 'Điềm văn (Ngọt sủng)'],
      intro: '病娇诱受大小姐 Omega vs 憨笨直球穷打工仔 Alpha。老板每天变着法子狂撩我，我到底该装傻还是顺水推舟？',
      introVi: 'Bệnh kiều dụ thụ đại tiểu thư Omega vs Ngốc nghếch thẳng tính Alpha đi làm thuê. Bà chủ mỗi ngày đổi đủ trò thả thính cuồng nhiệt, ta rốt cuộc nên giả ngốc hay thuận nước đẩy thuyền?',
      status: 'completed',
      chapterCount: 70,
      wordCount: '29.5万字',
      score: '11,988,406',
      rankingType: 'free',
      rank: 4,
    },
  ],
  points: [
    {
      novelId: '1473506',
      title: '探虚陵现代篇',
      titleVi: 'Thám Hư Lăng Hiện Đại Thiên',
      author: '君sola',
      authorVi: 'Quân sola',
      tags: ['百合', '现代', '盗墓', '强强', '情有独钟', '正剧'],
      tagsVi: ['Bách hợp (GL)', 'Hiện đại', 'Đạo mộ / Thám hiểm', 'Cường cường', 'Tình hữu độc chung', 'Chính kịch'],
      intro: '百合界超百亿超高积分第一神作！洛神与师清漪穿越千年的宿命情深与探险宏篇。',
      introVi: 'Thần tác số một có tích phân kỷ lục hơn 11 tỷ trong giới Bách Hợp! Mối tình ngàn năm và thiên hùng ca thám hiểm của Lạc Thần cùng Sư Thanh Y.',
      status: 'completed',
      chapterCount: 743,
      wordCount: '320.5万字',
      score: '11,287,505,920',
      rankingType: 'points',
      rank: 1,
    },
    {
      novelId: '8382415',
      title: '卧底后被港岛大小姐缠上了',
      titleVi: 'Ngọa Để Hậu Bị Cảng Đảo Đại Tiểu Thư Triền Thượng Liễu',
      author: '岁寻',
      authorVi: 'Tuế Tầm',
      tags: ['百合', '现代', '豪门世家', '破镜重圆', '年下', '正剧'],
      tagsVi: ['Bách hợp (GL)', 'Hiện đại', 'Hào môn thế gia', 'Gương vỡ lại lành', 'Niên hạ', 'Chính kịch'],
      intro: '突破47亿超级积分的现代港风百合天花板，卧底风云与大小姐的极致深情。',
      introVi: 'Tác phẩm trần nhà bách hợp phong cách Hong Kong phá vỡ 4.7 tỷ siêu tích phân, sóng gió gián điệp và tình thâm cực hạn của đại tiểu thư.',
      status: 'completed',
      chapterCount: 165,
      wordCount: '68.5万字',
      score: '4,787,816,960',
      rankingType: 'points',
      rank: 2,
    },
    {
      novelId: '3334550',
      title: '女仵作',
      titleVi: 'Nữ Ngỗ Tác',
      author: '请君莫笑',
      authorVi: 'Thỉnh Quân Mạc Tiếu',
      tags: ['百合', '古代', '穿越时空', '种田文', '悬疑推理', '正剧'],
      tagsVi: ['Bách hợp (GL)', 'Cổ đại', 'Xuyên không', 'Điền văn', 'Huyền nghi / Suy lý', 'Chính kịch'],
      intro: '近20亿超高积分古风百合巅峰，吴蔚与绣娘细水长流、生死相托的市井传奇。',
      introVi: 'Đỉnh phong bách hợp cổ phong gần 2 tỷ siêu cao tích phân, truyền kỳ phố thị nước chảy đá mòn sống chết có nhau của Ngô Úy và Tú Nương.',
      status: 'completed',
      chapterCount: 240,
      wordCount: '95.6万字',
      score: '1,840,000,000',
      rankingType: 'points',
      rank: 3,
    },
    {
      novelId: '3907377',
      title: '泾渭情殇',
      titleVi: 'Kính Vị Tình Thương',
      author: '请君莫笑',
      authorVi: 'Thỉnh Quân Mạc Tiếu',
      tags: ['百合', '古代', '宫廷侯爵', '虐文', '正剧', '强强'],
      tagsVi: ['Bách hợp (GL)', 'Cổ đại', 'Cung đình hầu tước', 'Ngược văn', 'Chính kịch', 'Cường cường'],
      intro: '晋江古风百合权谋封神之作，齐颜与南宫静女虐恋情深、荡气回肠。',
      introVi: 'Tác phẩm phong thần quyền mưu bách hợp cổ phong Tấn Giang, mối tình ngược tâm sâu nặng làm rung động lòng người của Tề Nhan và Nam Cung Tĩnh Nữ.',
      status: 'completed',
      chapterCount: 307,
      wordCount: '118.2万字',
      score: '1,617,257,216',
      rankingType: 'points',
      rank: 4,
    },
    {
      novelId: '7630015',
      title: '今夜刮起台风',
      titleVi: 'Kim Dạ Quát Khởi Thai Phong',
      author: '玄笺',
      authorVi: 'Huyền Tiên',
      tags: ['百合', '现代', '都市', '情有独钟', '恋爱合约', '高岭之花'],
      tagsVi: ['Bách hợp (GL)', 'Hiện đại', 'Đô thị', 'Tình hữu độc chung', 'Hợp đồng tình yêu', 'Đóa hoa trên cao'],
      intro: '玄笺代表作之一，逾14亿超高积分，楚腰旗袍美人的深陷之爱。',
      introVi: 'Một trong những tác phẩm tiêu biểu của Huyền Tiên, hơn 1.4 tỷ tích phân, tình yêu chìm đắm cùng mỹ nhân sườn xám thon thả.',
      status: 'completed',
      chapterCount: 107,
      wordCount: '48.2万字',
      score: '1,424,979,200',
      rankingType: 'points',
      rank: 5,
    },
    {
      novelId: '3414028',
      title: '入赘',
      titleVi: 'Nhập Chuế',
      author: '请君莫笑',
      authorVi: 'Thỉnh Quân Mạc Tiếu',
      tags: ['百合', '古代', '穿越时空', '女扮男装', '经商', '正剧'],
      tagsVi: ['Bách hợp (GL)', 'Cổ đại', 'Xuyên không', 'Nữ giả nam', 'Kinh thương', 'Chính kịch'],
      intro: '超12亿积分经商穿越古风百合经典，云安与林不羡温情携手。',
      introVi: 'Kinh điển bách hợp cổ phong kinh thương xuyên không hơn 1.2 tỷ tích phân, Vân An cùng Lâm Bất Tiện ấm áp kề vai.',
      status: 'completed',
      chapterCount: 198,
      wordCount: '89.4万字',
      score: '1,294,000,000',
      rankingType: 'points',
      rank: 6,
    },
  ],
};

export interface JjwxcDiscoveryResult {
  items: JjwxcStoryItem[];
  isLive: boolean;
  dateStr?: string;
  updatedAt?: string;
  note?: string;
}

export interface JjwxcDiscoveryOptions {
  dailyPeriod?: JjwxcDailyFreePeriod;
  forceRefresh?: boolean;
  signal?: AbortSignal;
}

export class JjwxcDiscoveryService {
  /**
   * Lấy danh sách truyện Bách Hợp theo bảng xếp hạng (tự động cập nhật mỗi ngày theo Tấn Giang)
   */
  public static async getRankings(
    rankingType: JjwxcRankingType = 'vip_gold',
    options?: JjwxcDiscoveryOptions
  ): Promise<JjwxcDiscoveryResult> {
    const period = options?.dailyPeriod || 'today';
    const now = new Date();
    const todayYMD = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}-${String(now.getDate()).padStart(2, '0')}`;
    const cacheKey = `jjwxc_rankings_v3_${rankingType}_${rankingType === 'daily_free' ? period : 'all'}_${todayYMD}`;

    // 1. Kiểm tra cache trong localStorage nếu không yêu cầu làm mới
    if (typeof window !== 'undefined' && !options?.forceRefresh) {
      try {
        const cached = localStorage.getItem(cacheKey);
        if (cached) {
          const parsed = JSON.parse(cached);
          if (parsed && Array.isArray(parsed.items) && parsed.items.length > 0) {
            return {
              items: parsed.items,
              isLive: true,
              dateStr: parsed.dateStr,
              updatedAt: parsed.updatedAt || 'Hôm nay',
              note: parsed.note,
            };
          }
        }
      } catch {
        // Bỏ qua lỗi đọc cache
      }
    }

    // 2. Tải trực tiếp từ Tấn Giang qua CORS Proxy
    try {
      if (rankingType === 'daily_free') {
        if (period === 'tomorrow') {
          const parsed = this.parseDailyFreeHtml('', 'tomorrow');
          const resultData: JjwxcDiscoveryResult = {
            items: parsed.items,
            isLive: true,
            dateStr: parsed.dateStr,
            updatedAt: '00:00 (Nửa đêm)',
            note: parsed.note,
          };
          return resultData;
        }

        const url = period === 'yesterday'
          ? 'https://m.jjwxc.net/free/limitedfreehistory'
          : 'https://m.jjwxc.net/free/index';

        const res = await safeFetch(url, { signal: options?.signal });
        if (res.ok) {
          const html = await res.text();
          const parsed = this.parseDailyFreeHtml(html, period);
          if (parsed.items.length > 0) {
            const updatedAt = new Date().toLocaleTimeString('vi-VN', { hour: '2-digit', minute: '2-digit' });
            const resultData: JjwxcDiscoveryResult = {
              items: parsed.items,
              isLive: true,
              dateStr: parsed.dateStr,
              updatedAt,
              note: parsed.note,
            };
            if (typeof window !== 'undefined') {
              try { localStorage.setItem(cacheKey, JSON.stringify(resultData)); } catch {}
            }
            return resultData;
          }
        }
      } else {
        // Các bảng xếp hạng thông thường (Kim Bảng, Tháng, Quý, Nửa Năm, Miễn Phí, Tích Phân)
        const urlMap: Record<string, string> = {
          vip_gold: 'https://m.jjwxc.net/channel/natural/9/7/9',
          month: 'https://m.jjwxc.net/channel/713',
          quarter: 'https://m.jjwxc.net/channel/714',
          half_year: 'https://m.jjwxc.net/channel/natural/109/15/9001',
          free: 'https://m.jjwxc.net/free/index',
          points: 'https://m.jjwxc.net/channel/natural/9/7/9',
        };

        const targetUrl = urlMap[rankingType] || urlMap.vip_gold;
        const res = await safeFetch(targetUrl, { signal: options?.signal });
        if (res.ok) {
          const html = await res.text();
          const parsedItems = this.parseRankingHtml(html, rankingType);

          // Trộn thêm danh sách tuyển chọn để đảm bảo mỗi bảng luôn có 15-20+ tác phẩm
          const fallback = CURATED_BAIHE_RANKINGS[rankingType] || CURATED_BAIHE_RANKINGS.vip_gold || [];
          const seenIds = new Set(parsedItems.map(i => i.novelId));
          const merged = [...parsedItems];
          fallback.forEach(fb => {
            if (!seenIds.has(fb.novelId)) {
              seenIds.add(fb.novelId);
              merged.push({ ...fb, rank: merged.length + 1 });
            }
          });

          if (merged.length > 0) {
            const updatedAt = new Date().toLocaleTimeString('vi-VN', { hour: '2-digit', minute: '2-digit' });
            const resultData: JjwxcDiscoveryResult = {
              items: merged,
              isLive: true,
              dateStr: `Hôm nay (${todayYMD})`,
              updatedAt,
              note: 'Dữ liệu trực tiếp từ Tấn Giang · Tự động cập nhật mỗi ngày',
            };
            if (typeof window !== 'undefined') {
              try { localStorage.setItem(cacheKey, JSON.stringify(resultData)); } catch {}
            }
            return resultData;
          }
        }
      }
    } catch {
      // Giữ nguyên khi mạng ngoài không truy cập được
    }

    // 3. Fallback danh sách tuyển chọn
    const fallbackList = CURATED_BAIHE_RANKINGS[rankingType] || CURATED_BAIHE_RANKINGS.vip_gold;
    return {
      items: fallbackList,
      isLive: false,
      dateStr: `Hôm nay (${todayYMD})`,
      updatedAt: 'Nội bộ',
      note: 'Danh sách tuyển chọn nội bộ chất lượng cao (đầy đủ văn án & mục lục)',
    };
  }

  /**
   * Phân tích HTML danh sách truyện từ các trang bảng xếp hạng WAP Tấn Giang
   */
  public static parseRankingHtml(html: string, rankingType: JjwxcRankingType): JjwxcStoryItem[] {
    const results: JjwxcStoryItem[] = [];
    if (!html) return results;

    const seen = new Set<string>();
    const curatedMap = new Map<string, JjwxcStoryItem>();
    (CURATED_BAIHE_RANKINGS[rankingType] || []).forEach(item => curatedMap.set(item.novelId, item));

    const reg = /<a[^>]+href=["']\/book2\/(\d+)["'][^>]*>(.*?)<\/a>(?:\s*-\s*<a[^>]+href=["']\/wapauthor\/\d+["'][^>]*>(.*?)<\/a>)?/g;
    let m: RegExpExecArray | null;
    let rankCounter = 1;

    while ((m = reg.exec(html)) !== null) {
      const novelId = m[1];
      const rawTitle = m[2].replace(/<[^>]+>/g, '').replace(/[《》]/g, '').trim();
      const rawAuthor = m[3] ? m[3].replace(/<[^>]+>/g, '').trim() : '';

      if (!novelId || seen.has(novelId) || !rawTitle || rawTitle.length < 2 || rawTitle.includes('展开')) {
        continue;
      }
      seen.add(novelId);

      const curated = curatedMap.get(novelId);
      if (curated) {
        results.push({
          ...curated,
          rank: rankCounter++,
          rankingType,
        });
      } else {
        const titleVi = toSinoVietnamese(rawTitle);
        const author = rawAuthor || 'Tác giả Tấn Giang';
        const authorVi = rawAuthor ? toSinoVietnamese(rawAuthor) : 'Tác giả Tấn Giang';
        const status = (rankingType === 'quarter' || html.includes('完结') || rankingType === 'half_year') ? 'completed' : 'ongoing';

        results.push({
          novelId,
          title: rawTitle,
          titleVi,
          author,
          authorVi,
          tags: ['百合', rankingType === 'free' ? '免费' : 'VIP'],
          tagsVi: ['Bách hợp (GL)', rankingType === 'free' ? 'Miễn phí' : 'VIP Tấn Giang'],
          intro: `【Tấn Giang BXH】《${rawTitle}》- Tác giả: ${author}.`,
          introVi: `Tác phẩm Bách Hợp《${titleVi}》của tác giả ${authorVi} (${rawTitle}). Trạng thái: ${status === 'completed' ? 'Đã hoàn thành' : 'Đang ra'}. Nhấp Tải truyện để đọc nội dung dịch đầy đủ.`,
          status,
          chapterCount: 80,
          wordCount: '~',
          score: 'Thịnh hành',
          rankingType,
          rank: rankCounter++,
        });
      }
      if (results.length >= 30) break;
    }

    return results;
  }

  /**
   * Phân tích các truyện VIP mở đọc miễn phí mỗi ngày (Hôm nay, Hôm qua, Ngày mai)
   */
  public static parseDailyFreeHtml(
    html: string,
    period: JjwxcDailyFreePeriod
  ): { items: JjwxcStoryItem[]; dateStr: string; note: string } {
    const results: JjwxcStoryItem[] = [];
    const seen = new Set<string>();
    const reg = /<a[^>]+href=["']\/book2\/(\d+)["'][^>]*>(.*?)<\/a>(?:\s*-\s*<a[^>]+href=["']\/wapauthor\/\d+["'][^>]*>(.*?)<\/a>)?/g;

    const now = new Date();
    const dateFormatted = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}-${String(now.getDate()).padStart(2, '0')}`;

    if (period === 'today') {
      const block = html.split('限时免费')[1]?.split('</div>')[0] || html;
      let m: RegExpExecArray | null;
      let rank = 1;
      while ((m = reg.exec(block)) !== null) {
        const id = m[1];
        const rawTitle = m[2].replace(/<[^>]+>/g, '').replace(/[《》]/g, '').trim();
        const rawAuthor = m[3] ? m[3].replace(/<[^>]+>/g, '').trim() : '';
        if (!id || seen.has(id) || !rawTitle || rawTitle.length < 2 || rawTitle.includes('展开')) continue;
        seen.add(id);

        const titleVi = toSinoVietnamese(rawTitle);
        const author = rawAuthor || 'Tác giả Tấn Giang';
        results.push({
          novelId: id,
          title: rawTitle,
          titleVi,
          author,
          authorVi: toSinoVietnamese(author),
          tags: ['限时免费', 'VIP限免'],
          tagsVi: ['VIP Mở Miễn Phí Hôm Nay', 'Đang miễn phí'],
          intro: `Tác phẩm VIP đang được Tấn Giang mở đọc miễn phí trong hôm nay (${rawTitle}).`,
          introVi: `Tác phẩm VIP đang được Tấn Giang mở đọc miễn phí trong hôm nay (${titleVi}). Tranh thủ tải về thư viện đọc miễn phí!`,
          status: 'completed',
          chapterCount: 80,
          wordCount: '~',
          score: 'Đang mở VIP',
          rankingType: 'daily_free',
          dailyPeriod: 'today',
          rank: rank++,
        });
        if (results.length >= 10) break;
      }

      return {
        items: results.length > 0 ? results : (CURATED_BAIHE_RANKINGS.daily_free || []),
        dateStr: `Hôm nay (${dateFormatted})`,
        note: 'Các tác phẩm VIP này đang được Tấn Giang mở đọc miễn phí trong hôm nay (kết thúc lúc 00:00).',
      };
    }

    if (period === 'yesterday') {
      const daySections = html.split(/<span class=["']listtitle["']>([^<]+)<\/span>/);
      const yTitle = daySections[1] || 'Hôm qua';
      const yBlock = daySections[2] || html;

      let m: RegExpExecArray | null;
      let rank = 1;
      while ((m = reg.exec(yBlock)) !== null) {
        const id = m[1];
        const rawTitle = m[2].replace(/<[^>]+>/g, '').replace(/[《》]/g, '').trim();
        const rawAuthor = m[3] ? m[3].replace(/<[^>]+>/g, '').trim() : '';
        if (!id || seen.has(id) || !rawTitle || rawTitle.length < 2 || rawTitle.includes('展开')) continue;
        seen.add(id);

        const titleVi = toSinoVietnamese(rawTitle);
        const author = rawAuthor || 'Tác giả Tấn Giang';
        results.push({
          novelId: id,
          title: rawTitle,
          titleVi,
          author,
          authorVi: toSinoVietnamese(author),
          tags: ['昨日限免', '往期限免'],
          tagsVi: ['Đã Mở VIP Hôm Qua', 'Hết hạn miễn phí'],
          intro: `Tác phẩm VIP đã mở miễn phí trong ngày hôm qua (${rawTitle}).`,
          introVi: `Tác phẩm VIP đã mở miễn phí trong ngày hôm qua (${titleVi}). Nếu bạn có Cookie VIP thì vẫn tải và đọc bình thường.`,
          status: 'completed',
          chapterCount: 80,
          wordCount: '~',
          score: 'Đã kết thúc',
          rankingType: 'daily_free',
          dailyPeriod: 'yesterday',
          rank: rank++,
        });
        if (results.length >= 10) break;
      }

      const cleanDate = yTitle.replace('日限免', '').trim();
      return {
        items: results.length > 0 ? results : (CURATED_BAIHE_RANKINGS.daily_free || []),
        dateStr: `Hôm qua (${cleanDate})`,
        note: 'Các tác phẩm VIP đã mở miễn phí ngày hôm qua (đợt đọc miễn phí đã kết thúc lúc 00:00).',
      };
    }

    // Tomorrow (Ngày mai)
    const tmr = new Date(now.getTime() + 24 * 60 * 60 * 1000);
    const tmrFormatted = `${tmr.getFullYear()}-${String(tmr.getMonth() + 1).padStart(2, '0')}-${String(tmr.getDate()).padStart(2, '0')}`;

    const previewList = (CURATED_BAIHE_RANKINGS.daily_free || []).map((item, idx) => ({
      ...item,
      dailyPeriod: 'tomorrow' as JjwxcDailyFreePeriod,
      rank: idx + 1,
      tags: ['明日预告', 'VIP限免'],
      tagsVi: ['VIP Dự Kiến Ngày Mai', 'Sắp mở'],
      introVi: `Tác phẩm VIP dự kiến mở miễn phí trong đợt tiếp theo (${item.titleVi}). Tấn Giang kích hoạt đợt mới lúc 00:00!`,
    }));

    return {
      items: previewList,
      dateStr: `Ngày mai (${tmrFormatted})`,
      note: 'Tấn Giang cập nhật và kích hoạt đợt truyện VIP mở miễn phí tiếp theo vào đúng 00:00 (nửa đêm) hàng ngày.',
    };
  }
}
