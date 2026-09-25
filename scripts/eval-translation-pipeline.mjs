import { pipeline } from '@huggingface/transformers';
import { Converter } from 'opencc-js/t2cn';

const toSimplified = Converter({ from: 't', to: 'cn' });
const models = [
  {
    name: 'modern-v14',
    path: 'D:/DATASET/LilyMT-modern-v14-admin-web',
    samples: [
      '“琇……景琇……”凌晨三點鍾，季侑言再一次喊著心上人的名字，痛徹心扉地從噩夢中驚醒。',
      '這是重生後的第三個月了，也是重生後不知道第幾次這樣夜半從噩夢中驚醒了。可季侑言依舊不能安心，依舊在每個夢醒時分，有些分不清，哪一個才是真實的現在，哪一個，才是虛幻的夢境。',
      '八點半，林悅提著熱乎乎的早點風風火火地上來了。她人還未進玄關，聲音便先傳進了客廳：“季姐，我到了，我們要抓緊一點了，外面好像有些堵車。”\n季侑言聞聲迎了出來，笑著接過林悅手上的早點，從善如流地答應道：“好，我這邊都差不多了，吃過就能走了。你吃了嗎？沒有的話一起吃點。”',
    ],
  },
  {
    name: 'ancient-v14',
    path: 'D:/DATASET/LilyMT-ancient-v14-admin-web',
    samples: [
      '“殿下，不好了，陛下和皇后娘娘确实在勤政殿里商议您的婚事。”乐清忙下跪行礼道。',
      '苏南雪气哄哄的快步上前，委屈的看向自己的母皇、母后，“儿臣听闻母皇和母后在商议我的婚事，儿臣才不要嫁给那些臭乾元呢。”',
    ],
  },
];

for (const spec of models) {
  console.log(`\n=== ${spec.name} ===`);
  const model = await pipeline('translation', spec.path, { device: 'cpu', dtype: 'q8' });
  for (const [index, original] of spec.samples.entries()) {
    const input = toSimplified(original);
    const result = await model(input, {
      num_beams: 2,
      repetition_penalty: 1.2,
      max_new_tokens: 512,
      early_stopping: true,
      do_sample: false,
    });
    const output = result[0]?.translation_text || '';
    console.log(`\n[${index + 1}] IN (${input.length}): ${input}`);
    console.log(`[${index + 1}] OUT (${output.length}): ${output}`);
    if (spec.name === 'modern-v14' && index === 2) {
      const sentences = input.match(/[^。！？]+[。！？]*/g)?.map(value => value.trim()).filter(Boolean) || [];
      const splitResult = await model(sentences, {
        num_beams: 2,
        repetition_penalty: 1.2,
        max_new_tokens: 300,
        early_stopping: true,
        do_sample: false,
      });
      console.log(`[${index + 1}] SENTENCE MODE: ${splitResult.map(item => item.translation_text).join(' ')}`);
    }
  }
}
