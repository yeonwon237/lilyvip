import { applyAncientTerminology } from '../ancientTerminology';

function equal(actual: string, expected: string, label: string): void {
  if (actual !== expected) throw new Error(`${label}\nExpected: ${expected}\nActual:   ${actual}`);
}

equal(
  applyAncientTerminology('雨露期的第二日，她发烧了。', 'Ngày thứ hai của kỳ mưa sương, nàng phát sốt.'),
  'Ngày thứ hai của kỳ vũ lộ, nàng phát sốt.',
  'normalizes ancient ABO rain period',
);

equal(
  applyAncientTerminology('那道城门是瓮城。', 'Cổng thành đó là thành Ông.'),
  'Cổng thành đó là ủng thành.',
  'normalizes barbican term',
);

equal(
  applyAncientTerminology('她已身中流矢。', 'Nàng đã trúng lưu tiễn.'),
  'Nàng đã trúng tên lạc.',
  'normalizes stray-arrow term',
);

equal(
  applyAncientTerminology('“假死药”服下后气息全无。', 'Sau khi uống xong, hơi thở hoàn toàn biến mất.'),
  '“Thuốc giả chết” uống vào thì hơi thở hoàn toàn biến mất.',
  'restores omitted medicine name for exact guarded construction',
);

equal(
  applyAncientTerminology('雨露期的第二日，她发烧了。', 'Ngày thứ hai của kỳ vũ lộ, nàng phát sốt.'),
  'Ngày thứ hai của kỳ vũ lộ, nàng phát sốt.',
  'leaves a correct translation unchanged',
);

equal(
  applyAncientTerminology('今日下雨，她没有出门。', 'Hôm nay trời mưa, nàng không ra ngoài.'),
  'Hôm nay trời mưa, nàng không ra ngoài.',
  'does not touch unrelated rain wording',
);

equal(
  applyAncientTerminology('你的雨露期还有几日？', 'Mưa Lộ kỳ của ngươi còn mấy ngày nữa?'),
  'Kỳ vũ lộ của ngươi còn mấy ngày nữa?',
  'normalizes inverted rain-period transliteration',
);

equal(
  applyAncientTerminology('顾檀越远道而来。', 'Cố Đàn đi xa tới.'),
  'Cố thí chủ đi xa tới.',
  'restores Buddhist honorific after a surname',
);

equal(
  applyAncientTerminology('乾元之间的信香相斥。', 'Tín hương giữa Càn Nguyên mắng nhiếc.'),
  'Tín hương giữa Càn Nguyên bài xích nhau.',
  'normalizes mutually repelling scents',
);

console.log('ancient terminology tests passed');
