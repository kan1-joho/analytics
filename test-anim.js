// アニメーション有効時の最終状態テスト（アニメーション終了後に、静止状態が正しいこと）
const { JSDOM } = require('jsdom'); const path = require('path'); const assert = require('assert');
let pass = 0, fail = 0;
function t(name, fn) { try { fn(); pass++; console.log('成功  ' + name); } catch (e) { fail++; console.log('失敗  ' + name + ' → ' + e.message); } }
const wait = ms => new Promise(r => setTimeout(r, ms));
JSDOM.fromFile(path.join(__dirname, '../app-a.html'), { runScripts: 'dangerously', resources: 'usable', pretendToBeVisual: true }).then(async dom => {
  await wait(400);
  const w = dom.window, d = w.document, $ = s => d.querySelector(s), $$ = s => Array.from(d.querySelectorAll(s));
  const click = (a, v) => $('[data-act="' + a + '"]' + (v === undefined ? '' : '[data-v="' + v + '"]')).click();
  const rows = () => $$('tbody tr').map(r => Array.from(r.children).map(c => c.textContent)), svgTxt = () => $('svg').textContent;
  const anim = () => w.Anim.on();
  t('アニメーションが有効な環境である', () => assert.ok(anim()));
  click('next'); click('s1pick', 1); click('s1open');
  await wait(100);
  t('S1 公開直後はドットが一部だけ（動きの途中）', () => assert.ok($$('svg circle').length < 10));
  await wait(1100);
  t('S1 アニメーション後：全10点・平均/中央値ラベルが正しい', () => { assert.strictEqual($$('svg circle').length, 10); assert.ok(svgTxt().includes('中央値 100') && (svgTxt().match(/平均 70/g) || []).length === 2); });
  click('next'); click('s2pick', 0); click('s2add');
  await wait(150);
  t('S2 追加直後：平均ラベルは途中の値（動いている最中）', () => assert.ok(!svgTxt().includes('平均 91.67')));
  await wait(1100);
  t('S2 アニメーション後：平均91.67・中央値72.5、■が1つ', () => { assert.ok(svgTxt().includes('平均 91.67') && svgTxt().includes('中央値 72.5')); assert.strictEqual($$('svg rect').length, 1); assert.deepStrictEqual(rows()[1], ['追加後', '91.67', '72.5']); });
  click('s2undo'); await wait(1100);
  t('S2 元に戻す後：1行（初期データ）、平均70・中央値70', () => { assert.deepStrictEqual(rows(), [['いまのデータ', '70', '70']]); assert.strictEqual($$('svg circle').length, 5); });
  click('s2add'); await wait(900); click('s2try'); 
  d.getElementById('i2_4').value = '90'; click('s2ok'); await wait(900);
  t('S2 数値変更後（アニメーション終了後）：93.33・72.5', () => { assert.deepStrictEqual(rows()[1], ['変更後', '93.33', '72.5']); assert.ok(svgTxt().includes('平均 93.33')); });
  click('s2close'); click('next'); await wait(800);
  t('S3 入場後（箱が伸びた後）：箱の幅がXの四分位範囲に相当', () => { const r = $$('svg rect')[0]; assert.ok(Math.abs(Number(r.getAttribute('width')) - 20 * (620 / 60)) < 0.01); });
  console.log('\n成功 ' + pass + ' / 失敗 ' + fail); process.exit(fail ? 1 : 0);
});
