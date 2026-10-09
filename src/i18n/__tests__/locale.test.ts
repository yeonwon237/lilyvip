import assert from 'node:assert/strict';
import fs from 'node:fs';
import ts from 'typescript';
const storage = new Map<string,string>([['LILY_UI_LANGUAGE_V1','vi']]);
Object.defineProperty(globalThis, 'localStorage', {value:{getItem:(key:string)=>storage.get(key)??null,setItem:(key:string,value:string)=>storage.set(key,value)},configurable:true});
Object.defineProperty(globalThis, 'document', {value:{documentElement:{lang:''},title:''},configurable:true});
Object.defineProperty(globalThis, 'window', {value:{addEventListener:()=>{}},configurable:true});
const {t,setLocale,getLocale,localeTag}=await import('../index');
const {PRODUCT_PLANS}=await import('../../config/plans');
const en=JSON.parse(fs.readFileSync('src/i18n/en.json','utf8')) as Record<string,string>;
assert.equal(getLocale(),'vi');
assert.equal(t('Thư viện'),'Thư viện');
setLocale('en');
assert.equal(t('Thư viện'),'Library');
assert.equal(document.documentElement.lang,'en');
assert.equal(storage.get('LILY_UI_LANGUAGE_V1'),'en');
assert.equal(localeTag(),'en-US');
const {formatRelativeTime}=await import('../../utils/dateUtils');
assert.equal(formatRelativeTime(new Date(Date.now()-3600000).toISOString()), '1 hour ago');
assert.equal(t('Đã thêm "{0}" vào thư viện',['Tên truyện của tôi']), 'Added "Tên truyện của tôi" to your library');
assert.equal(t('Tên truyện riêng không trong bản dịch'),'Tên truyện riêng không trong bản dịch');
assert.equal(PRODUCT_PLANS[0].benefits[0], '3 books from LilyHub');
setLocale('vi');
assert.equal(PRODUCT_PLANS[0].benefits[0], '3 truyện từ LilyHub');
assert.equal(document.documentElement.lang,'vi');
for(const [key,value] of Object.entries(en)){
 const tokens=(s:string)=>[...s.matchAll(/\{\d+\}/g)].map(m=>m[0]).sort();
 assert.deepEqual(tokens(value),tokens(key),`Placeholders differ: ${key}`);
}
let calls=0;
function walkDir(dir:string){for(const item of fs.readdirSync(dir,{withFileTypes:true})){
 const file=`${dir}/${item.name}`; if(item.isDirectory()){if(item.name!=='__tests__')walkDir(file);continue}
 if(!/\.tsx?$/.test(file))continue;
 const ast=ts.createSourceFile(file,fs.readFileSync(file,'utf8'),ts.ScriptTarget.Latest,true);
 function visit(node:ts.Node){if(ts.isCallExpression(node)&&node.expression.getText(ast)==='t'&&node.arguments[0]&&ts.isStringLiteral(node.arguments[0])){
 const key=node.arguments[0].text.trim().replace(/\s+/g,' ');assert.ok(key in en,`${file}: missing ${key}`);calls++;
 }ts.forEachChild(node,visit)}visit(ast);
}}
walkDir('src');console.log(`Locale persistence, reactive plans, user-content preservation and ${calls} translation calls passed.`);
