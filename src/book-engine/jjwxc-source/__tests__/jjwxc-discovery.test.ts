import assert from 'node:assert/strict';
import {
  toSinoVietnamese,
  translateTags,
  JjwxcDiscoveryService,
  JJWXC_RANKING_TABS
} from '../JjwxcDiscoveryService';

let totalTests = 0;
let passedTests = 0;

function check(condition: boolean, name: string) {
  totalTests++;
  if (condition) {
    passedTests++;
    console.log(`  ✓ PASS: ${name}`);
  } else {
    console.error(`  ✗ FAIL: ${name}`);
    process.exitCode = 1;
  }
}

console.log('\n=== JJWXC Discovery: Sino-Vietnamese transcription ===');
{
  check(toSinoVietnamese('退退退退下！').includes('Thoái Thoái Thoái Thoái Hạ'), 'transliterates 退退退退下！');
  check(toSinoVietnamese('余情可待') === 'Dư Tình Khả Đãi', 'transliterates 余情可待');
  check(toSinoVietnamese('影后成双') === 'Ảnh Hậu Thành Song', 'transliterates 影后成双');
  check(toSinoVietnamese('分久必合') === 'Phân Cửu Tất Hợp', 'transliterates 分久必合');
  check(toSinoVietnamese('放肆') === 'Phóng Tứ', 'transliterates 放肆');
  check(toSinoVietnamese('珈西') === 'Gia Tây', 'transliterates 珈西');
  check(toSinoVietnamese('闵然') === 'Mẫn Nhiên', 'transliterates 闵然');
  check(toSinoVietnamese('玄笺') === 'Huyền Tiên', 'transliterates 玄笺');
  check(toSinoVietnamese('宁远') === 'Ninh Viễn', 'transliterates 宁远');
}

console.log('\n=== JJWXC Discovery: Tag Translation ===');
{
  const tags = ['百合', '重生', '娱乐圈', '破镜重圆', '甜文', 'ABO', '强强'];
  const translated = translateTags(tags);
  check(translated.includes('Bách hợp (GL)'), 'translates 百合');
  check(translated.includes('Trọng sinh'), 'translates 重生');
  check(translated.includes('Giới giải trí'), 'translates 娱乐圈');
  check(translated.includes('Gương vỡ lại lành'), 'translates 破镜重圆');
  check(translated.includes('Điềm văn (Ngọt sủng)'), 'translates 甜文');
  check(translated.includes('ABO'), 'keeps ABO');
  check(translated.includes('Cường cường'), 'translates 强强');
}

console.log('\n=== JJWXC Discovery: Rankings Tabs & Fallback Data ===');
{
  check(JJWXC_RANKING_TABS.length === 7, 'defines 7 ranking categories');
  check(JJWXC_RANKING_TABS.some(t => t.id === 'daily_free'), 'includes daily_free tab');

  // Test fetching each tab
  async function testTabs() {
    for (const tab of JJWXC_RANKING_TABS) {
      const { items, dateStr } = await JjwxcDiscoveryService.getRankings(tab.id);
      check(items.length > 0, `tab ${tab.id} returns story list`);
      check(Boolean(items[0].novelId), `tab ${tab.id} items have novelId`);
      check(Boolean(items[0].titleVi), `tab ${tab.id} items have titleVi`);
      check(items[0].tagsVi.length > 0, `tab ${tab.id} items have translated tags`);
      check(typeof items[0].rank === 'number', `tab ${tab.id} items have rank`);
      check(items[0].status === 'completed' || items[0].status === 'ongoing', `tab ${tab.id} items have valid status`);
    }

    // Test daily_free periods
    const todayRes = await JjwxcDiscoveryService.getRankings('daily_free', { dailyPeriod: 'today' });
    check(todayRes.items.length > 0, 'daily_free today returns items');
    check(Boolean(todayRes.dateStr), 'daily_free today has dateStr');

    const yesterdayRes = await JjwxcDiscoveryService.getRankings('daily_free', { dailyPeriod: 'yesterday' });
    check(yesterdayRes.items.length > 0, 'daily_free yesterday returns items');
    check(Boolean(yesterdayRes.dateStr), 'daily_free yesterday has dateStr');

    const tomorrowRes = await JjwxcDiscoveryService.getRankings('daily_free', { dailyPeriod: 'tomorrow' });
    check(tomorrowRes.items.length > 0, 'daily_free tomorrow returns items');
    check(Boolean(tomorrowRes.note), 'daily_free tomorrow has note');

    console.log(`\nAll JJWXC Discovery tests completed: ${passedTests}/${totalTests} passed.`);
  }

  testTabs();
}
