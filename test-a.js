// 計算・データの自動テスト（node tests/test-a.js）
const assert = require('assert');
const D = require('../data-a.js');
const { Stats } = require('../common.js');
let pass = 0, fail = 0;
function t(name, fn) { try { fn(); pass++; console.log('成功  ' + name); } catch (e) { fail++; console.log('失敗  ' + name + ' → ' + e.message); } }
const near = (a, b) => assert.ok(Math.abs(a - b) < 1e-9, a + ' != ' + b);
const s1 = D.stage1, s2 = D.stage2, s3 = D.stage3;

t('A組の平均値・中央値・最大・最小', () => { const a = Stats.summary(s1.A.scores); near(a.mean, 70); near(a.median, 70); near(a.max, 70); near(a.min, 70); });
t('B組の平均値・中央値・最大・最小', () => { const b = Stats.summary(s1.B.scores); near(b.mean, 70); near(b.median, 100); near(b.max, 100); near(b.min, 0); });
t('S1の期待値がデータ計算と一致', () => { ['A', 'B'].forEach(k => { const x = Stats.summary(s1[k].scores); Object.keys(s1.expected[k]).forEach(p => near(x[p], s1.expected[k][p])); }); });
t('S2 初期の平均値・中央値が70', () => { const b = Stats.summary(s2.base); near(b.mean, 70); near(b.median, 70); });
t('S2 200追加後の平均値≒91.67・中央値72.5', () => { const a = Stats.summary(s2.base.concat([s2.extra])); assert.strictEqual(Stats.fmt(a.mean), '91.67'); near(a.median, 72.5); });
t('S2 元データを破壊しない（追加はコピーに対して行う）', () => { const before = s2.base.slice(); Stats.summary(s2.base.concat([s2.extra])); assert.deepStrictEqual(s2.base, before); });
['X', 'Y'].forEach(k => t('S3 ' + k + ' の5数要約と四分位範囲', () => {
  const s = Stats.summary(s3[k]), e = s3.expected[k];
  ['min', 'q1', 'median', 'q3', 'max', 'iqr'].forEach(p => near(s[p], e[p]));
}));
t('S3 データは昇順でなくても同じ結果（並べ替え前提でない）', () => { const r = s3.X.slice().reverse(); near(Stats.summary(r).q1, 55); near(Stats.summary(r).q3, 75); });
t('S3 四分位数：偶数個のとき（例 1,2,3,4 → Q1=1.5, Q3=3.5）', () => { const q = Stats.quartiles([1, 2, 3, 4]); near(q.q1, 1.5); near(q.q3, 3.5); });
t('S3 問題の正解選択肢が計算結果と一致', () => {
  const x = Stats.summary(s3.X), y = Stats.summary(s3.Y), st = s3.steps, f = Stats.fmt;
  assert.strictEqual(st[0].options[st[0].answer], f(x.median));
  assert.strictEqual(st[1].options[st[1].answer], f(x.q1) + 'と' + f(x.q3));
  assert.strictEqual(st[2].options[st[2].answer], f(x.iqr));
  assert.strictEqual(st[3].options[st[3].answer], f(x.min) + 'と' + f(x.max));
  assert.ok(x.median === y.median && x.iqr > y.iqr, '問題5の主張（中央値同じ・Xの四分位範囲が大きい）');
  assert.ok(st[2].options.includes(f(x.max - x.min)), '範囲(最大−最小)の誤答選択肢');
});
t('確認問題は4問で、正解番号が選択肢の範囲内', () => { assert.strictEqual(D.quiz.length, 4); D.quiz.forEach(q => assert.ok(q.answer >= 0 && q.answer < q.options.length && q.explain.length > 0)); });
t('S1/S2の予想の正解番号が範囲内', () => { assert.ok(s1.answer === 1 && s2.answer === 0); });
t('外部通信・保存APIを使っていない', () => {
  const fs = require('fs'), path = require('path');
  ['../app-a.html', '../common.js', '../data-a.js', '../common.css'].forEach(p => {
    const src = fs.readFileSync(path.join(__dirname, p), 'utf8');
    assert.ok(!/fetch\(|XMLHttpRequest|localStorage|sessionStorage|indexedDB|document\.cookie|sendBeacon|WebSocket|https?:\/\//.test(src), p);
  });
});
console.log('\n成功 ' + pass + ' / 失敗 ' + fail);
process.exit(fail ? 1 : 0);
