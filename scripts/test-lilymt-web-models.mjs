import { pipeline } from '@huggingface/transformers';

const cases = [
  {
    repo: 'yennguyen45/LilyMT-modern-v14-web',
    input: '【Hiện đại】林悦提着早餐跑进来：“季姐，我到了。”',
  },
  {
    repo: 'yennguyen45/LilyMT-ancient-v3-web',
    input: '妹妹拉住姐姐的衣袖：“姐姐，你等等我。”',
  },
];

for (const item of cases) {
  console.log(`Loading ${item.repo}`);
  const model = await pipeline('translation', item.repo, { device: 'cpu', dtype: 'q8' });
  const result = await model(item.input, {
    num_beams: 2,
    repetition_penalty: 1.2,
    max_new_tokens: 300,
    early_stopping: true,
    do_sample: false,
  });
  console.log(item.repo, result);
}
