import { pipeline } from '@huggingface/transformers';

const cases = [
  {
    model: 'D:/DATASET/LilyMT-modern-v14-admin-web',
    text: '简清缄默不语，静静地凝视她，目光依旧带着审视意味。',
  },
  {
    model: 'D:/DATASET/LilyMT-modern-v14-admin-web',
    text: '月光下，简清凝望着她，伸出手，挑开她的腰带与睡袍。',
  },
  {
    model: 'D:/DATASET/LilyMT-ancient-v14-admin-web',
    text: '家令答应不迭，抬袖低身一礼：“臣这就去。”',
  },
  {
    model: 'D:/DATASET/LilyMT-ancient-v14-admin-web',
    text: '汉王看得目不转睛，听他此言，也只胡乱应两声而已。',
  },
];

const configs = [
  ['beam2-rp1.2', { num_beams: 2, repetition_penalty: 1.2, max_new_tokens: 300, early_stopping: true, do_sample: false }],
  ['beam2-clean', { num_beams: 2, max_new_tokens: 300, early_stopping: true, do_sample: false }],
  ['greedy', { num_beams: 1, max_new_tokens: 300, do_sample: false }],
  ['beam4-clean', { num_beams: 4, max_new_tokens: 300, early_stopping: true, do_sample: false }],
];

const modernBatch = [
  '简清缄默不语，静静地凝视她，目光依旧带着审视意味。',
  '暧昧逐渐冷凝在月光下。',
  '鹿饮溪慢慢坐起身，拉开彼此的距离：“你，我，我们……”',
  '她说不出一句完整的话语，大脑一片混沌，脑海涌入一些断断续续的记忆，似乎是属于她的，又似乎不属于她。',
  '月光下，简清凝望着她，伸出手，挑开她的腰带与睡袍。',
  '腰带松开，睡袍如水般滑落，堆叠在腰间，月光虔诚地亲吻她脊背，照得肌肤宛如羊脂白玉般细腻无暇。',
  '鹿饮溪赤裸着上身，跨坐在简清腰上，满腔柔情尽数褪去。',
  '她闭上眼睛，掩去眸中翻涌的怒意，扬起左手，“啪”一声，狠狠扇了身下人一耳光。',
];

let loadedPath = '';
let translator;
for (const item of cases) {
  if (loadedPath !== item.model) {
    loadedPath = item.model;
    translator = await pipeline('translation', item.model, { device: 'cpu', dtype: 'q8' });
    console.log(`\n=== ${item.model} ===`);
  }
  console.log(`\nZH: ${item.text}`);
  for (const [name, config] of configs) {
    const result = await translator(item.text, config);
    console.log(`${name}: ${result[0]?.translation_text || ''}`);
  }
}

translator = await pipeline('translation', 'D:/DATASET/LilyMT-modern-v14-admin-web', { device: 'cpu', dtype: 'q8' });
console.log('\n=== modern array batch ===');
const batched = await translator(modernBatch, configs[0][1]);
batched.forEach((item, index) => console.log(`${index + 1}: ${item.translation_text}`));
