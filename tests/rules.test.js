/* Tests for rules.js. Runs in a browser (tests/index.html) or on a Mac with:
 *   /System/Library/Frameworks/JavaScriptCore.framework/Versions/Current/Helpers/jsc rules.js tests/rules.test.js
 */
(function (root) {
  'use strict';
  var R = root.MoodRules;
  var out = (typeof print === 'function') ? print : function (s) { console.log(s); };
  var DAY = R.DAY_MS;
  var NOW = Date.UTC(2026, 10, 18, 12, 0, 0);
  var results = [];

  function item(o) {
    return Object.assign({
      id: o.title, title: 'x', type: 'movie', time: 'two', moods: [], recBy: '',
      status: 'next', rating: null, addedAt: NOW - DAY
    }, o);
  }
  function eq(a, b, msg) {
    if (JSON.stringify(a) !== JSON.stringify(b)) {
      throw new Error((msg || 'mismatch') + ': expected ' + JSON.stringify(b) + ', got ' + JSON.stringify(a));
    }
  }
  function test(name, fn) {
    try { fn(); results.push({ name: name, ok: true }); }
    catch (e) { results.push({ name: name, ok: false, err: e.message }); }
  }
  function titles(r) { return r.picks.map(function (p) { return p.item.title; }); }

  test('Only Up next items are considered', function () {
    var r = R.pick([item({ title: 'A', status: 'done' }), item({ title: 'B' })], {}, NOW);
    eq(titles(r), ['B']);
  });

  test('Empty Up next says so', function () {
    var r = R.pick([item({ title: 'A', status: 'done' })], {}, NOW);
    eq(r.picks.length, 0);
    eq(r.emptyReason, 'Your Up next list is empty. Add something first.');
  });

  test('Type filter removes other types; "any" keeps all', function () {
    var items = [item({ title: 'M', type: 'movie' }), item({ title: 'B', type: 'book' })];
    eq(titles(R.pick(items, { type: 'book' }, NOW)), ['B']);
    eq(titles(R.pick(items, { type: 'any' }, NOW)).length, 2);
  });

  test('Type filter that removes everything names the type', function () {
    var r = R.pick([item({ title: 'M', type: 'movie' })], { type: 'show' }, NOW);
    eq(r.emptyReason, 'Nothing in Up next is a show.');
  });

  test('Time filter keeps items no longer than the time you have', function () {
    var items = [
      item({ title: 'S', time: 'short' }), item({ title: 'H', time: 'hour' }),
      item({ title: 'T', time: 'two' }), item({ title: 'W', time: 'weekend' })
    ];
    eq(titles(R.pick(items, { time: 'hour' }, NOW)).sort(), ['H', 'S']);
    eq(R.pick(items, { time: 'weekend' }, NOW).considered, 4);
  });

  test('Time filter that removes everything names the time', function () {
    var r = R.pick([item({ title: 'W', time: 'weekend' })], { time: 'short', type: 'movie' }, NOW);
    eq(r.emptyReason, 'Nothing that is a movie fits in "under 30 min".');
  });

  test('+2 for each matching mood, 0 for non-matching', function () {
    var it = item({ title: 'A', moods: ['cozy', 'funny', 'sad'] });
    var s = R.scoreItem(it, { moods: ['cozy', 'funny', 'intense'] }, {}, NOW);
    eq(s.points, 4);
    eq(s.reasons.map(function (x) { return x.text; }), ['Cozy', 'Funny']);
  });

  test('Trusted recommender: +1 at average 4.0 with 2 rated picks', function () {
    var items = [
      item({ title: 'D1', recBy: 'Sam', status: 'done', rating: 4 }),
      item({ title: 'D2', recBy: 'sam ', status: 'done', rating: 4 }),
      item({ title: 'N', recBy: 'Sam' })
    ];
    var r = R.pick(items, {}, NOW);
    eq(r.picks[0].points, 1);
    eq(r.picks[0].reasons[0].text, "Sam's picks average 4.0★");
  });

  test('No trusted bonus with only 1 rated pick, or average below 4.0', function () {
    var one = [item({ title: 'D1', recBy: 'Sam', status: 'done', rating: 5 }), item({ title: 'N', recBy: 'Sam' })];
    eq(R.pick(one, {}, NOW).picks[0].points, 0, 'one rated pick');
    var low = [
      item({ title: 'D1', recBy: 'Jo', status: 'done', rating: 4 }),
      item({ title: 'D2', recBy: 'Jo', status: 'done', rating: 3 }),
      item({ title: 'N', recBy: 'Jo' })
    ];
    eq(R.pick(low, {}, NOW).picks[0].points, 0, 'average 3.5');
  });

  test('Unrated finished picks do not count toward the average', function () {
    var s = R.recommenderStats([
      item({ title: 'A', recBy: 'Kim', status: 'done', rating: 5 }),
      item({ title: 'B', recBy: 'Kim', status: 'done', rating: null }),
      item({ title: 'C', recBy: 'Kim' })
    ]).kim;
    eq([s.count, s.rated, s.average], [3, 1, 5]);
  });

  test('Waiting bonus: 30 days gets nothing, 31 days gets +1', function () {
    eq(R.scoreItem(item({ addedAt: NOW - 30 * DAY }), {}, {}, NOW).points, 0, '30 days');
    var s = R.scoreItem(item({ addedAt: NOW - 31 * DAY }), {}, {}, NOW);
    eq(s.points, 1, '31 days');
    eq(s.reasons[0].text, 'waiting 31 days');
  });

  test('Highest score wins; ties go to the item added first', function () {
    var items = [
      item({ title: 'Newer', moods: ['cozy'], addedAt: NOW - 2 * DAY }),
      item({ title: 'Older', moods: ['cozy'], addedAt: NOW - 5 * DAY }),
      item({ title: 'Best', moods: ['cozy', 'funny'], addedAt: NOW - 1 * DAY })
    ];
    eq(titles(R.pick(items, { moods: ['cozy', 'funny'] }, NOW)), ['Best', 'Older', 'Newer']);
  });

  test('Only the top 3 are shown', function () {
    var items = [1, 2, 3, 4, 5].map(function (n) { return item({ title: 'I' + n, addedAt: NOW - n * DAY }); });
    var r = R.pick(items, {}, NOW);
    eq(r.picks.length, 3);
    eq(r.considered, 5);
  });

  test('Worked example: Paddington 2 scores 6', function () {
    var items = [
      item({ title: 'D1', recBy: 'Sam', status: 'done', rating: 5 }),
      item({ title: 'D2', recBy: 'Sam', status: 'done', rating: 4 }),
      item({ title: 'Paddington 2', recBy: 'Sam', moods: ['cozy', 'funny', 'light'], addedAt: NOW - 45 * DAY })
    ];
    var p = R.pick(items, { moods: ['cozy', 'funny'] }, NOW).picks[0];
    eq(R.explain(p), "6 points: Cozy +2, Funny +2, Sam's picks average 4.5★ +1, waiting 45 days +1");
  });

  test('Rules text uses the numbers in RULES', function () {
    var t = R.rulesText().join(' ');
    if (t.indexOf('+2 points') === -1 || t.indexOf('30 days') === -1 || t.indexOf('4.0★') === -1) {
      throw new Error('rules text does not match RULES');
    }
  });

  var failed = results.filter(function (r) { return !r.ok; });
  results.forEach(function (r) { out((r.ok ? 'PASS  ' : 'FAIL  ') + r.name + (r.ok ? '' : '\n      ' + r.err)); });
  out('\n' + (results.length - failed.length) + ' of ' + results.length + ' tests passed.');
  root.MoodTestResults = results;
})(typeof globalThis !== 'undefined' ? globalThis : this);
