/* Moodreel scoring rules.
 * Pure functions only: no screen code, no network, no AI.
 * Every number the app uses to pick something lives in RULES below.
 */
(function (root) {
  'use strict';

  var RULES = {
    pointsPerTag: 2,           // +2 for each mood or genre you picked that the item has
    trustedPoints: 1,          // +1 if the recommender's picks rate well for you
    trustedMinAverage: 4.0,    //   ...average rating at least this
    trustedMinRated: 2,        //   ...across at least this many rated picks
    waitingPoints: 1,          // +1 if it has waited a long time
    waitingMoreThanDays: 30,   //   ...more than this many days
    showTop: 3                 // how many picks to show
  };

  var TYPES = [
    { id: 'movie', label: 'Movie', icon: '🎬', noun: 'a movie' },
    { id: 'show', label: 'Show', icon: '📺', noun: 'a show' },
    { id: 'book', label: 'Book', icon: '📖', noun: 'a book' },
    { id: 'music', label: 'Music', icon: '🎵', noun: 'music' },
    { id: 'podcast', label: 'Podcast', icon: '🎙️', noun: 'a podcast' }
  ];

  var STATUSES = [
    { id: 'next', label: 'Up next' },
    { id: 'progress', label: 'In progress' },
    { id: 'done', label: 'Finished' }
  ];
  // Statuses that Pick for me can suggest.
  var PICKABLE = ['next', 'progress'];

  // Ordered shortest to longest. An item fits if it is no longer than the time you have.
  var TIMES = [
    { id: 'short', label: 'Under 30 min', rank: 1 },
    { id: 'hour', label: 'About 1 hour', rank: 2 },
    { id: 'two', label: 'About 2 hours', rank: 3 },
    { id: 'weekend', label: 'A whole weekend', rank: 4 }
  ];
  // Books are measured in books, not hours.
  var BOOK_LENGTHS = [
    { id: 'single', label: 'Single book', rank: 1 },
    { id: 'trilogy', label: 'Trilogy', rank: 2 },
    { id: 'saga', label: 'Saga (4+ books)', rank: 3 }
  ];

  // Moods apply to every type.
  var MOODS = [
    { id: 'cozy', label: 'Cozy' },
    { id: 'funny', label: 'Funny' },
    { id: 'intense', label: 'Intense' },
    { id: 'mind', label: 'Mind-bending' },
    { id: 'sad', label: 'Sad is OK' },
    { id: 'light', label: 'Light' },
    { id: 'spooky', label: 'Spooky' },
    { id: 'romantic', label: 'Romantic' },
    { id: 'upbeat', label: 'Upbeat' },
    { id: 'chill', label: 'Chill' },
    { id: 'kids', label: 'Kids & family' },
    { id: 'foreign', label: 'Foreign language' }
  ];

  // Each genre lists the types it fits. One id per genre, so a tag can never be counted twice.
  // No "Comedy" genre: the Funny mood covers it.
  var SCREEN = ['movie', 'show', 'book'];
  var GENRES = [
    { id: 'scifi', label: 'Sci-Fi', types: SCREEN },
    { id: 'action', label: 'Action', types: SCREEN },
    { id: 'horror', label: 'Horror', types: SCREEN },
    { id: 'fantasy', label: 'Fantasy', types: SCREEN },
    { id: 'mystery', label: 'Mystery', types: SCREEN },
    { id: 'thriller', label: 'Thriller', types: SCREEN },
    { id: 'drama', label: 'Drama', types: SCREEN },
    { id: 'adventure', label: 'Adventure', types: SCREEN },
    { id: 'historical', label: 'Historical', types: SCREEN },
    { id: 'documentary', label: 'Documentary / Nonfiction', types: SCREEN },
    { id: 'animated', label: 'Animated', types: SCREEN },
    { id: 'legal', label: 'Legal', types: SCREEN.concat(['podcast']) },
    { id: 'news', label: 'News', types: SCREEN.concat(['podcast']) },
    { id: 'pop', label: 'Pop', types: ['music'] },
    { id: 'rock', label: 'Rock', types: ['music'] },
    { id: 'hiphop', label: 'Hip-hop', types: ['music'] },
    { id: 'rnb', label: 'R&B', types: ['music'] },
    { id: 'jazz', label: 'Jazz', types: ['music'] },
    { id: 'classical', label: 'Classical', types: ['music'] },
    { id: 'electronic', label: 'Electronic', types: ['music'] },
    { id: 'country', label: 'Country', types: ['music'] },
    { id: 'indie', label: 'Indie', types: ['music'] },
    { id: 'metal', label: 'Metal', types: ['music'] },
    { id: 'latin', label: 'Latin', types: ['music'] },
    { id: 'soundtrack', label: 'Soundtrack', types: ['music'] },
    { id: 'truecrime', label: 'True crime', types: ['podcast'] },
    { id: 'history', label: 'History', types: ['podcast'] },
    { id: 'science', label: 'Science', types: ['podcast'] },
    { id: 'interview', label: 'Interview', types: ['podcast'] },
    { id: 'sports', label: 'Sports', types: ['podcast'] },
    { id: 'business', label: 'Business', types: ['podcast'] },
    { id: 'storytelling', label: 'Storytelling', types: ['podcast'] },
    { id: 'selfimprovement', label: 'Self-improvement', types: ['podcast'] },
    { id: 'popculture', label: 'Pop culture', types: ['podcast'] }
  ];

  function fits(genre, type) { return genre.types.indexOf(type) !== -1; }

  // For the "Any" view: genres grouped under small labels. A genre can appear in more than one group.
  var GENRE_GROUPS = [
    { id: 'screen', label: 'Movies, shows & books', types: SCREEN },
    { id: 'music', label: 'Music', types: ['music'] },
    { id: 'podcast', label: 'Podcasts', types: ['podcast'] }
  ].map(function (g) {
    g.genres = GENRES.filter(function (x) { return g.types.some(function (t) { return fits(x, t); }); });
    return g;
  });

  var DAY_MS = 24 * 60 * 60 * 1000;

  function find(list, id) {
    for (var i = 0; i < list.length; i++) if (list[i].id === id) return list[i];
    return null;
  }
  function label(list, id) { var f = find(list, id); return f ? f.label : id; }
  function noun(type) { var t = find(TYPES, type); return t ? t.noun : type; }

  /* ---- Tags ---- */
  /* Genres that fit a type ('any' or empty = every genre). */
  function genresFor(type) {
    if (!type || type === 'any') return GENRES.slice();
    return GENRES.filter(function (g) { return fits(g, type); });
  }
  /* Every tag you can put on an item of this type: all moods + that type's genres. */
  function tagsFor(type) { return MOODS.concat(genresFor(type)); }
  /* Keep only tags that fit the type, without duplicates. */
  function cleanTags(type, tags) {
    var ok = tagsFor(type).map(function (t) { return t.id; });
    var out = [];
    (Array.isArray(tags) ? tags : []).forEach(function (t) {
      if (ok.indexOf(t) !== -1 && out.indexOf(t) === -1) out.push(t);
    });
    return out;
  }
  function tagLabel(id) { return label(MOODS.concat(GENRES), id); }

  /* ---- Time / length ---- */
  function lengthsFor(type) { return type === 'book' ? BOOK_LENGTHS : TIMES; }
  function isBookLength(id) { return !!find(BOOK_LENGTHS, id); }
  function timeLabel(id) { return label(TIMES.concat(BOOK_LENGTHS), id); }
  /* Make sure an item's length fits its type (books: Single/Trilogy/Saga; others: minutes/hours). */
  function cleanTime(type, time) {
    if (find(lengthsFor(type), time)) return time;
    return type === 'book' ? 'single' : 'two';
  }
  /* Does this item fit the time you picked? */
  function fitsTime(item, time) {
    if (!time) return true;
    var itemIsBook = item.type === 'book';
    if (isBookLength(time)) {
      // Book lengths only apply to books.
      return itemIsBook ? find(BOOK_LENGTHS, item.time).rank <= find(BOOK_LENGTHS, time).rank : true;
    }
    if (itemIsBook) return true; // books aren't timed in hours, so they always pass an hours filter
    var it = find(TIMES, item.time), want = find(TIMES, time);
    return !!it && !!want && it.rank <= want.rank;
  }

  /* ---- Star ratings (half stars allowed) ---- */
  /* A rating is 0.5 to 5 in steps of 0.5, or null for "not rated". */
  function cleanRating(v) {
    if (typeof v !== 'number' || !isFinite(v)) return null;
    var r = Math.round(v * 2) / 2;
    return r >= 0.5 && r <= 5 ? r : null;
  }
  /* Tapping star n: if it isn't lit yet, fill to n. Tap the same star again for a half (n - 0.5).
   * Tap it a third time to clear. Tapping any other star fills to that star. */
  function nextRating(current, n) {
    if (current === n) return n - 0.5;
    if (current === n - 0.5) return null;
    return n;
  }
  /* How star n (1..5) looks for a rating: 'full', 'half' or 'empty'. */
  function starState(rating, n) {
    if (rating >= n) return 'full';
    if (rating >= n - 0.5) return 'half';
    return 'empty';
  }

  /* ---- Old saved data ---- */
  /* Bring an item from an older version up to date. Returns a new object. */
  function migrateItem(it) {
    var out = {};
    Object.keys(it || {}).forEach(function (k) { out[k] = it[k]; });
    out.time = cleanTime(out.type, out.time);
    out.moods = cleanTags(out.type, out.moods);
    if (!find(STATUSES, out.status)) out.status = 'next';
    return out;
  }

  function personKey(name) { return String(name || '').trim().toLowerCase(); }

  /* Average rating per recommender, from finished items that have a rating.
   * Returns { key: { name, count, rated, average, total } } where count = all picks. */
  function recommenderStats(items) {
    var out = {};
    items.forEach(function (it) {
      var key = personKey(it.recBy);
      if (!key) return;
      if (!out[key]) out[key] = { name: String(it.recBy).trim(), count: 0, rated: 0, total: 0, average: null };
      var s = out[key];
      s.count++;
      if (it.status === 'done' && cleanRating(it.rating) !== null) {
        s.rated++;
        s.total += it.rating;
      }
    });
    Object.keys(out).forEach(function (k) {
      var s = out[k];
      s.average = s.rated ? Math.round((s.total / s.rated) * 10) / 10 : null;
    });
    return out;
  }

  function isTrusted(stat, rules) {
    return !!stat && stat.rated >= rules.trustedMinRated && stat.average !== null &&
      stat.average >= rules.trustedMinAverage;
  }

  function daysWaiting(item, now) {
    return Math.floor((now - item.addedAt) / DAY_MS);
  }

  /* Score one item. Returns { points, reasons: [{ text, points }] }. */
  function scoreItem(item, choice, stats, now, rules) {
    rules = rules || RULES;
    var reasons = [];
    var chosen = choice.moods || [];
    // Walk the master tag order (moods, then genres) so the math always reads the same way.
    tagsFor('any').map(function (t) { return t.id; }).forEach(function (m) {
      if (chosen.indexOf(m) !== -1 && (item.moods || []).indexOf(m) !== -1) {
        reasons.push({ text: tagLabel(m), points: rules.pointsPerTag });
      }
    });
    var stat = stats[personKey(item.recBy)];
    if (isTrusted(stat, rules)) {
      reasons.push({
        text: stat.name + "'s picks average " + stat.average.toFixed(1) + '★',
        points: rules.trustedPoints
      });
    }
    var days = daysWaiting(item, now);
    if (days > rules.waitingMoreThanDays) {
      reasons.push({ text: 'waiting ' + days + ' days', points: rules.waitingPoints });
    }
    var points = reasons.reduce(function (sum, r) { return sum + r.points; }, 0);
    return { points: points, reasons: reasons };
  }

  /* choice = { moods: [ids], time: id|null, type: id|'any'|null }
   * Returns { picks: [{ item, points, reasons }], considered, emptyReason } */
  function pick(items, choice, now, rules) {
    rules = rules || RULES;
    choice = choice || {};
    var stats = recommenderStats(items);
    var open = items.filter(function (it) { return PICKABLE.indexOf(it.status) !== -1; });
    if (!open.length) {
      return { picks: [], considered: 0, emptyReason: 'Nothing is Up next or In progress. Add something first.' };
    }

    var type = choice.type && choice.type !== 'any' ? choice.type : null;
    var byType = type ? open.filter(function (it) { return it.type === type; }) : open;
    if (!byType.length) {
      return { picks: [], considered: 0, emptyReason: 'Nothing in Up next or In progress is ' + noun(type) + '.' };
    }

    var byTime = byType.filter(function (it) { return fitsTime(it, choice.time); });
    if (!byTime.length) {
      return {
        picks: [], considered: 0,
        emptyReason: 'Nothing' + (type ? ' that is ' + noun(type) : '') +
          ' fits in "' + timeLabel(choice.time).toLowerCase() + '".'
      };
    }

    var scored = byTime.map(function (it) {
      var s = scoreItem(it, choice, stats, now, rules);
      return { item: it, points: s.points, reasons: s.reasons };
    });
    scored.sort(function (a, b) {
      if (b.points !== a.points) return b.points - a.points;          // highest score first
      if (a.item.addedAt !== b.item.addedAt) return a.item.addedAt - b.item.addedAt; // tie: added first
      return String(a.item.id) < String(b.item.id) ? -1 : 1;
    });
    return { picks: scored.slice(0, rules.showTop), considered: scored.length, emptyReason: null };
  }

  function explain(p) {
    if (!p.reasons.length) return '0 points: nothing extra matched.';
    return p.points + (p.points === 1 ? ' point: ' : ' points: ') +
      p.reasons.map(function (r) { return r.text + ' +' + r.points; }).join(', ');
  }

  /* Plain-language rules, generated from RULES so the text can never drift from the math. */
  function rulesText(rules) {
    rules = rules || RULES;
    return [
      'Items in Up next or In progress are considered. Finished items are not.',
      'If you pick a type, anything of another type is left out.',
      'If you pick a time, anything longer is left out. Shorter items still count. Books are measured in books, not hours: they are only filtered by length (Single book, Trilogy, Saga) when you pick Book, so otherwise they always pass the time filter.',
      '+' + rules.pointsPerTag + ' points for each mood or genre you picked that the item has.',
      '+' + rules.trustedPoints + ' point if the person who recommended it has an average rating of ' +
        rules.trustedMinAverage.toFixed(1) + '★ or more, across at least ' + rules.trustedMinRated + ' finished picks you rated.',
      '+' + rules.waitingPoints + ' point if it has been waiting more than ' + rules.waitingMoreThanDays + ' days.',
      'Highest total wins. Ties go to whichever was added first.',
      'The top ' + rules.showTop + ' are shown, each with its math.'
    ];
  }

  var api = {
    RULES: RULES, TYPES: TYPES, STATUSES: STATUSES, PICKABLE: PICKABLE, TIMES: TIMES, BOOK_LENGTHS: BOOK_LENGTHS,
    MOODS: MOODS, GENRES: GENRES, GENRE_GROUPS: GENRE_GROUPS, DAY_MS: DAY_MS,
    label: label, noun: noun, genresFor: genresFor, tagsFor: tagsFor, cleanTags: cleanTags, tagLabel: tagLabel,
    lengthsFor: lengthsFor, timeLabel: timeLabel, cleanTime: cleanTime, fitsTime: fitsTime, migrateItem: migrateItem,
    cleanRating: cleanRating, nextRating: nextRating, starState: starState,
    personKey: personKey, recommenderStats: recommenderStats, isTrusted: isTrusted,
    daysWaiting: daysWaiting, scoreItem: scoreItem, pick: pick, explain: explain, rulesText: rulesText
  };
  if (typeof module !== 'undefined' && module.exports) module.exports = api;
  else root.MoodRules = api;
})(typeof globalThis !== 'undefined' ? globalThis : this);
