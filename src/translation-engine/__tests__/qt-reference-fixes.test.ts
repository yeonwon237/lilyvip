// Fixes found by comparing Lily QT with Dịch Ngay (see qt/data/README.md).
import { translateHanViet } from '../qt/qtTranslator';

function equal(actual: string, expected: string, label: string): void {
  // Dictionary values mix composed and decomposed Vietnamese marks; compare what readers see.
  if (actual.normalize('NFC') !== expected.normalize('NFC')) throw new Error(`${label}\nExpected: ${expected}\nActual:   ${actual}`);
}

const qt = async (text: string) => (await translateHanViet(text)).text.trim();

async function main() {
  equal(await qt('陆未晞把书放在桌子上，转身离开了房间。'),
    'Lục Vị Hy đặt sách ở trên mặt bàn, xoay người rời đi phòng.',
    '把 object goes before 在 instead of merging into 上书');
  equal(await qt('边跑边将手机塞进西服内部口袋。'),
    'Vừa chạy vừa nhét vào đồ vét bên trong túi điện thoại.',
    '将 + 塞进 keeps the fixed verb whole');
  equal(await qt('这件事情你不用管，我自己会处理好的。'),
    'Chuyện này ngươi không cần phải xen vào, ta tự mình sẽ xử lý tốt.',
    'frequent phrases and 我自己 keep the subject');
  equal(await qt('他站在门口看着她，眼神里满是温柔。'),
    'Hắn đứng ở cửa nhìn nàng, trong ánh mắt tràn đầy ôn nhu.',
    'reviewed everyday phrases');
  equal(await qt('你什么时候回来？'), 'Ngươi khi nào trở về?', 'junk "?;" senses are cleaned');
  const names = [{ source_term: '苏南雪', translation: 'Tô Nam Tuyết' }, { source_term: '姜槿时', translation: 'Khương Cẩn Thời' }];
  const named = async (text: string) => (await translateHanViet(text, names)).text.trim();
  equal(await named('苏南雪醒来时，天已经亮了。'), 'Lúc Tô Nam Tuyết tỉnh lại, trời đã sáng.', '"…时，" is a when-clause');
  equal(await named('她回头看向姜槿时，笑了。'), 'Nàng quay đầu lại nhìn về phía Khương Cẩn Thời, nở nụ cười.', 'a name ending in 时 is not a when-clause');
  equal(await qt('他离开之后，她哭了很久。'), 'Sau khi hắn rời đi, nàng khóc thật lâu.', 'event + 之后 → sau khi');
  equal(await qt('九殿下从落座之后，视线便一直在看她们这边。'), 'Cửu điện hạ từ sau khi ngồi xuống, tầm mắt liền vẫn luôn đang nhìn các nàng bên này.', '从 … 之后 → từ sau khi');
  equal(await qt('如果是之前，她一定答应。'), 'Nếu như là lúc trước, nàng nhất định đáp ứng.', '如果是之前 is not "trước khi"');
  equal(await qt('2.  第 2 章   我怎么帮你？'), '2. Chương 2: Ta thế nào giúp ngươi?', 'chapter heading with spaces');

  const { detectQtNames } = await import('../qt/qtNames');
  const text = [
    '苏南雪看着她。', '苏南雪笑了。', '苏南雪点头。', '南雪，过来。', '南雪乖乖坐下。', '南雪睡着了。',
    '过了一段时间。', '这段时间很忙。', '那段时间她很累。', '毕竟公主还小。', '毕竟公主不懂。', '毕竟公主任性。', '毕竟她累了。', '毕竟是夜里。', '毕竟太晚了。', '毕竟没人知道。', '毕竟她还小。',
  ];
  const found = await detectQtNames(text);
  equal(found['苏南雪'] || '', 'Tô Nam Tuyết', 'a name whose first two characters are a dictionary word (苏南)');
  equal(found['南雪'] || '', 'Nam Tuyết', 'a given name used alone');
  equal(String(Boolean(found['段时间'] || found['毕竟公'])), 'false', 'pieces of 一段时间 / 毕竟 are not names');
  console.log('qt reference fixes passed');
}

main().catch(error => { console.error(error); process.exit(1); });
