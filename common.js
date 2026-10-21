/* common.js — 計算(Stats)とSVG描画(Draw)。画面の流れには依存しない。 */
(function (root) {
  /* ---------- 計算 ---------- */
  function sorted(d) { return d.slice().sort(function (a, b) { return a - b; }); }
  function mean(d) { var s = 0; d.forEach(function (v) { s += v; }); return s / d.length; }
  function median(d) {
    var s = sorted(d), n = s.length, m = Math.floor(n / 2);
    return n % 2 ? s[m] : (s[m - 1] + s[m]) / 2;
  }
  // 教科書方式：中央値で前半・後半に分け（奇数個なら中央値自身は除く）、それぞれの中央値
  function quartiles(d) {
    var s = sorted(d), n = s.length, h = Math.floor(n / 2);
    return { q1: median(s.slice(0, h)), q3: median(s.slice(n - h)) };
  }
  function summary(d) {
    var s = sorted(d), q = quartiles(s);
    return { n: s.length, min: s[0], max: s[s.length - 1], mean: mean(s), median: median(s), q1: q.q1, q3: q.q3, iqr: q.q3 - q.q1 };
  }
  function fmt(x) { return String(Math.round(x * 100) / 100); }
  var Stats = { mean: mean, median: median, quartiles: quartiles, summary: summary, fmt: fmt };

  /* ---------- SVG描画 ---------- */
  var X0 = 70, X1 = 690, W = 720, INK = '#1b2733';
  function sc(min, max) { return function (v) { return X0 + (v - min) / (max - min) * (X1 - X0); }; }
  function clamp(x) { return Math.min(Math.max(x, 90), 630); }
  function T(x, y, s, o) {
    o = o || {};
    return '<text x="' + x + '" y="' + y + '" text-anchor="' + (o.a || 'middle') + '" font-size="' + (o.s || 16) +
      '" font-weight="' + (o.w || 400) + '" fill="' + (o.c || INK) + '">' + s + '</text>';
  }
  function L(x1, y1, x2, y2, c, w) {
    return '<line x1="' + x1 + '" y1="' + y1 + '" x2="' + x2 + '" y2="' + y2 + '" stroke="' + c + '" stroke-width="' + (w || 2) + '"/>';
  }
  function axis(sx, min, max, step, y, minor) {
    var s = L(X0, y, X1, y, '#445566', 2), v;
    if (minor) { for (v = min; v <= max + 1e-9; v += minor) { s += L(sx(v), y, sx(v), y + 4, '#8899aa', 1.5); } }
    for (v = min; v <= max + 1e-9; v += step) { s += L(sx(v), y, sx(v), y + 8, '#445566', 2) + T(sx(v), y + 28, v); }
    return s;
  }
  function svg(h, label, body) {
    return '<svg class="plot" viewBox="0 0 ' + W + ' ' + h + '" role="img" aria-label="' + label + '">' + body + '</svg>';
  }

  // ドットプロット（行ごとに 中央値◆ を上、平均値▲ を下に表示）
  function dots(rows, o) {
    var sx = sc(o.min, o.max), r = o.r || 9, RH = 232, out = '';
    rows.forEach(function (d, i) {
      var top = i * RH + 4, ay = top + 150, s = d.summary, cnt = {}, mx = sx(s.median), ax = sx(s.mean);
      out += T(8, ay - 10, d.label, { a: 'start', s: 20, w: 700, c: d.color });
      d.values.forEach(function (v) {
        var k = cnt[v] || 0, cx = sx(v), cy = ay - 4 - r - k * (2 * r + 1);
        cnt[v] = k + 1;
        out += (d.special !== undefined && v === d.special)
          ? '<rect x="' + (cx - r) + '" y="' + (cy - r) + '" width="' + 2 * r + '" height="' + 2 * r + '" fill="' + d.color + '" stroke="#fff" stroke-width="1.5"/>'
          : '<circle cx="' + cx + '" cy="' + cy + '" r="' + r + '" fill="' + d.color + '" stroke="#fff" stroke-width="1.5"/>';
      });
      out += axis(sx, o.min, o.max, o.step, ay);
      out += '<polygon points="' + mx + ',' + (top + 24) + ' ' + (mx + 10) + ',' + (top + 34) + ' ' + mx + ',' + (top + 44) + ' ' + (mx - 10) + ',' + (top + 34) + '" fill="#fff" stroke="' + INK + '" stroke-width="3"/>';
      out += T(clamp(mx), top + 16, '中央値 ' + fmt(s.median), { w: 700 });
      out += '<polygon points="' + ax + ',' + (ay + 34) + ' ' + (ax + 10) + ',' + (ay + 50) + ' ' + (ax - 10) + ',' + (ay + 50) + '" fill="' + INK + '"/>';
      out += T(clamp(ax), ay + 72, '平均 ' + fmt(s.mean), { w: 700 });
    });
    return svg(rows.length * RH + 8, o.title || 'ドットプロット', out);
  }

  // 箱ひげ図（show: median / q / iqr / minmax の数値を段階的に表示）
  function boxes(sets, o) {
    var sx = sc(o.min, o.max), RH = 132, out = '';
    sets.forEach(function (d, i) {
      var t = i * RH + 8, cy = t + 46, s = d.s, c = d.color, sh = d.show || {};
      out += T(8, cy + 7, d.label, { a: 'start', s: 24, w: 700, c: c });
      out += L(sx(s.min), cy, sx(s.q1), cy, c, 3) + L(sx(s.q3), cy, sx(s.max), cy, c, 3);
      out += L(sx(s.min), cy - 11, sx(s.min), cy + 11, c, 3) + L(sx(s.max), cy - 11, sx(s.max), cy + 11, c, 3);
      out += '<rect x="' + sx(s.q1) + '" y="' + (cy - 22) + '" width="' + (sx(s.q3) - sx(s.q1)) + '" height="44" fill="' + d.tint + '" stroke="' + c + '" stroke-width="3"/>';
      out += L(sx(s.median), cy - 22, sx(s.median), cy + 22, c, 7);
      if (d.dots) { d.dots.forEach(function (v) { out += '<circle cx="' + sx(v) + '" cy="' + cy + '" r="4.5" fill="' + INK + '" stroke="#fff" stroke-width="1.5"/>'; }); }
      if (sh.median) { out += T(sx(s.median), cy - 30, '中央値 ' + fmt(s.median), { w: 700 }); }
      if (sh.q) { out += T(sx(s.q1), cy + 42, 'Q1 ' + fmt(s.q1), { w: 700 }) + T(sx(s.q3), cy + 42, 'Q3 ' + fmt(s.q3), { w: 700 }); }
      if (sh.minmax) { out += T(sx(s.min), cy + 42, '最小 ' + fmt(s.min), { w: 700 }) + T(sx(s.max), cy + 42, '最大 ' + fmt(s.max), { w: 700 }); }
      if (sh.iqr) {
        out += L(sx(s.q1), cy + 56, sx(s.q3), cy + 56, INK, 2) + L(sx(s.q1), cy + 50, sx(s.q1), cy + 62, INK, 2) + L(sx(s.q3), cy + 50, sx(s.q3), cy + 62, INK, 2);
        out += T((sx(s.q1) + sx(s.q3)) / 2, cy + 80, '四分位範囲 = ' + fmt(s.q3) + ' − ' + fmt(s.q1) + ' = ' + fmt(s.iqr), { w: 700 });
      }
    });
    var ay = sets.length * RH + 14;
    out += axis(sx, o.min, o.max, o.step, ay, o.minor);
    return svg(ay + 44, o.title || '箱ひげ図', out);
  }

  var Draw = { dots: dots, boxes: boxes };
  if (typeof module !== 'undefined' && module.exports) { module.exports = { Stats: Stats, Draw: Draw }; }
  root.Stats = Stats; root.Draw = Draw;
})(typeof window !== 'undefined' ? window : globalThis);
