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

  test('Finished items are never picked', function () {
    var r = R.pick([item({ title: 'A', status: 'done' }), item({ title: 'B' })], {}, NOW);
    eq(titles(r), ['B']);
  });

  test('Nothing open says so', function () {
    var r = R.pick([item({ title: 'A', status: 'done' })], {}, NOW);
    eq(r.picks.length, 0);
    eq(r.emptyReason, 'Nothing is Up next or In progress. Add something first.');
  });

  test('Type filter removes other types; "any" keeps all', function () {
    var items = [item({ title: 'M', type: 'movie' }), item({ title: 'B', type: 'book' })];
    eq(titles(R.pick(items, { type: 'book' }, NOW)), ['B']);
    eq(titles(R.pick(items, { type: 'any' }, NOW)).length, 2);
  });

  test('Type filter that removes everything names the type', function () {
    var r = R.pick([item({ title: 'M', type: 'movie' })], { type: 'show' }, NOW);
    eq(r.emptyReason, 'Nothing in Up next or In progress is a show.');
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

  /* ---- v2: music, podcasts, genres ---- */

  test('A matching genre scores +2, the same as a mood', function () {
    var it = item({ title: 'A', type: 'movie', moods: ['scifi', 'horror', 'spooky'] });
    var s = R.scoreItem(it, { moods: ['scifi', 'spooky', 'action'] }, {}, NOW);
    eq(s.points, 4);
    eq(s.reasons.map(function (x) { return x.text; }), ['Spooky', 'Sci-Fi'], 'moods listed before genres');
  });

  test('Each type gets every mood plus only its own genres', function () {
    function ids(type) { return R.tagsFor(type).map(function (t) { return t.id; }); }
    var book = ids('book'), music = ids('music'), pod = ids('podcast');
    eq([book.indexOf('scifi') !== -1, book.indexOf('hiphop'), book.indexOf('truecrime')], [true, -1, -1], 'book');
    eq([music.indexOf('hiphop') !== -1, music.indexOf('horror')], [true, -1], 'music');
    eq([pod.indexOf('truecrime') !== -1, pod.indexOf('jazz')], [true, -1], 'podcast');
    ['book', 'music', 'podcast'].forEach(function (t) {
      eq(ids(t).slice(0, R.MOODS.length), R.MOODS.map(function (m) { return m.id; }), t + ' moods');
    });
    eq(ids('any').indexOf('hiphop') !== -1 && ids('any').indexOf('scifi') !== -1, true, 'any shows all genres');
  });

  test('No tag id is used twice, and there is no Comedy genre', function () {
    var all = R.tagsFor('any').map(function (t) { return t.id; });
    var dupes = all.filter(function (id, i) { return all.indexOf(id) !== i; });
    eq(dupes, []);
    eq(R.tagsFor('any').filter(function (t) { return /comedy/i.test(t.label); }).length, 0);
  });

  test('Switching type drops genres that do not fit, keeps moods', function () {
    eq(R.cleanTags('music', ['scifi', 'spooky', 'hiphop', 'spooky', 'nope']), ['spooky', 'hiphop']);
    eq(R.cleanTags('book', ['truecrime', 'cozy', 'mystery']), ['cozy', 'mystery']);
  });

  test('Music and podcast type filters work', function () {
    var items = [item({ title: 'Album', type: 'music' }), item({ title: 'Pod', type: 'podcast' }), item({ title: 'Film' })];
    eq(titles(R.pick(items, { type: 'music' }, NOW)), ['Album']);
    eq(titles(R.pick(items, { type: 'podcast' }, NOW)), ['Pod']);
  });

  test('Empty-filter messages read correctly for music and podcasts', function () {
    var r = R.pick([item({ title: 'M' })], { type: 'music' }, NOW);
    eq(r.emptyReason, 'Nothing in Up next or In progress is music.');
    r = R.pick([item({ title: 'P', type: 'podcast', time: 'two' })], { type: 'podcast', time: 'short' }, NOW);
    eq(r.emptyReason, 'Nothing that is a podcast fits in "under 30 min".');
  });

  test('Worked example: spooky true-crime podcast', function () {
    var items = [
      item({ title: 'D1', recBy: 'Priya', status: 'done', rating: 5 }),
      item({ title: 'D2', recBy: 'Priya', status: 'done', rating: 4 }),
      item({ title: 'Case File', type: 'podcast', time: 'hour', recBy: 'Priya', moods: ['truecrime', 'spooky', 'intense'], addedAt: NOW - 10 * DAY })
    ];
    var p = R.pick(items, { type: 'podcast', moods: ['spooky', 'truecrime'] }, NOW).picks[0];
    eq(R.explain(p), "5 points: Spooky +2, True crime +2, Priya's picks average 4.5★ +1");
  });

  test('Rule 4 says mood or genre', function () {
    eq(R.rulesText()[3], '+2 points for each mood or genre you picked that the item has.');
  });

  /* ---- v3: book lengths, new tags, In progress, starter quiz ---- */

  test('In progress items can be picked, and show up next to Up next', function () {
    var items = [item({ title: 'Now', status: 'progress', moods: ['cozy'] }), item({ title: 'Later' }), item({ title: 'Done', status: 'done' })];
    var r = R.pick(items, { moods: ['cozy'] }, NOW);
    eq(titles(r), ['Now', 'Later']);
  });

  test('Book lengths: a book fits if it is no longer than the length you pick', function () {
    var items = [
      item({ title: 'One', type: 'book', time: 'single' }),
      item({ title: 'Three', type: 'book', time: 'trilogy' }),
      item({ title: 'Many', type: 'book', time: 'saga' })
    ];
    eq(titles(R.pick(items, { type: 'book', time: 'single' }, NOW)), ['One']);
    eq(titles(R.pick(items, { type: 'book', time: 'trilogy' }, NOW)), ['One', 'Three']);
    eq(R.pick(items, { type: 'book', time: 'saga' }, NOW).considered, 3);
  });

  test('With Any type, books always pass an hours filter', function () {
    var items = [
      item({ title: 'Saga', type: 'book', time: 'saga' }),
      item({ title: 'Long film', type: 'movie', time: 'two' }),
      item({ title: 'Short show', type: 'show', time: 'short' })
    ];
    eq(titles(R.pick(items, { type: 'any', time: 'short' }, NOW)).sort(), ['Saga', 'Short show']);
  });

  test('Book-length empty message names the length', function () {
    var r = R.pick([item({ title: 'S', type: 'book', time: 'saga' })], { type: 'book', time: 'single' }, NOW);
    eq(r.emptyReason, 'Nothing that is a book fits in "single book".');
  });

  test('Each type gets the right length options; switching type fixes the length', function () {
    eq(R.lengthsFor('book').map(function (t) { return t.id; }), ['single', 'trilogy', 'saga']);
    eq(R.lengthsFor('movie').map(function (t) { return t.id; }), ['short', 'hour', 'two', 'weekend']);
    eq([R.cleanTime('book', 'weekend'), R.cleanTime('book', 'trilogy'), R.cleanTime('movie', 'saga'), R.cleanTime('show', 'hour')],
      ['single', 'trilogy', 'two', 'hour']);
  });

  test('Old saved books become "Single book"; old items keep their tags and status', function () {
    var old = { id: 'x', title: 'Old', type: 'book', time: 'weekend', moods: ['cozy', 'scifi'], status: 'next', addedAt: NOW };
    var m = R.migrateItem(old);
    eq([m.time, m.moods, m.status], ['single', ['cozy', 'scifi'], 'next']);
    eq(old.time, 'weekend', 'original is not changed');
  });

  test('New tags fit the right types', function () {
    function has(type, id) { return R.tagsFor(type).some(function (t) { return t.id === id; }); }
    eq(['movie', 'show', 'book', 'music', 'podcast'].map(function (t) { return has(t, 'kids') && has(t, 'foreign'); }),
      [true, true, true, true, true], 'Kids & family and Foreign language on every type');
    eq(['movie', 'show', 'book', 'music', 'podcast'].map(function (t) { return has(t, 'legal') && has(t, 'news'); }),
      [true, true, true, false, true], 'Legal and News on everything but music');
  });

  test('"News" is one tag even though it fits several types', function () {
    var all = R.tagsFor('any').map(function (t) { return t.id; });
    eq(all.filter(function (id) { return id === 'news'; }).length, 1);
    var groupsWithNews = R.GENRE_GROUPS.filter(function (g) { return g.genres.some(function (x) { return x.id === 'news'; }); });
    eq(groupsWithNews.map(function (g) { return g.id; }), ['screen', 'podcast']);
  });

  var S = root.MoodStarter;
  if (S) {
    test('Starter list: 25 titles, each with a valid length and tags for its type', function () {
      eq(S.STARTER.length, 25);
      var counts = {};
      S.STARTER.forEach(function (s) {
        counts[s.type] = (counts[s.type] || 0) + 1;
        eq(R.cleanTime(s.type, s.time), s.time, s.title + ' length');
        eq(R.cleanTags(s.type, s.moods), s.moods, s.title + ' tags');
      });
      eq(counts, { movie: 7, show: 6, book: 6, music: 3, podcast: 3 });
    });

    test('Quiz order: your types only, most favorites first, skip titles you have', function () {
      var cat = [
        { title: 'A', type: 'movie', moods: ['cozy'] },
        { title: 'B', type: 'movie', moods: ['cozy', 'funny'] },
        { title: 'C', type: 'book', moods: ['cozy', 'funny'] },
        { title: 'D', type: 'movie', moods: [] }
      ];
      var out = S.quizOrder(cat, ['movie'], ['cozy', 'funny'], [' d ']);
      eq(out.map(function (c) { return c.item.title + c.matches; }), ['B2', 'A1']);
      eq(S.quizOrder(cat, [], [], []).length, 4, 'no types picked = all types');
    });
  }

  var failed = results.filter(function (r) { return !r.ok; });
  results.forEach(function (r) { out((r.ok ? 'PASS  ' : 'FAIL  ') + r.name + (r.ok ? '' : '\n      ' + r.err)); });
  out('\n' + (results.length - failed.length) + ' of ' + results.length + ' tests passed.');
  root.MoodTestResults = results;
})(typeof globalThis !== 'undefined' ? globalThis : this);
