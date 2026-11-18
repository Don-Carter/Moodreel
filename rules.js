/* Moodreel scoring rules.
 * Pure functions only: no screen code, no network, no AI.
 * Every number the app uses to pick something lives in RULES below.
 */
(function (root) {
  'use strict';

  var RULES = {
    pointsPerMood: 2,          // +2 for each mood you picked that the item has
    trustedPoints: 1,          // +1 if the recommender's picks rate well for you
    trustedMinAverage: 4.0,    //   ...average rating at least this
    trustedMinRated: 2,        //   ...across at least this many rated picks
    waitingPoints: 1,          // +1 if it has waited a long time
    waitingMoreThanDays: 30,   //   ...more than this many days
    showTop: 3                 // how many picks to show
  };

  var TYPES = [
    { id: 'movie', label: 'Movie', icon: '🎬' },
    { id: 'show', label: 'Show', icon: '📺' },
    { id: 'book', label: 'Book', icon: '📖' }
  ];

  // Ordered shortest to longest. An item fits if it is no longer than the time you have.
  var TIMES = [
    { id: 'short', label: 'Under 30 min', rank: 1 },
    { id: 'hour', label: 'About 1 hour', rank: 2 },
    { id: 'two', label: 'About 2 hours', rank: 3 },
    { id: 'weekend', label: 'A whole weekend', rank: 4 }
  ];

  var MOODS = [
    { id: 'cozy', label: 'Cozy' },
    { id: 'funny', label: 'Funny' },
    { id: 'intense', label: 'Intense' },
    { id: 'mind', label: 'Mind-bending' },
    { id: 'sad', label: 'Sad is OK' },
    { id: 'light', label: 'Light' }
  ];

  var DAY_MS = 24 * 60 * 60 * 1000;

  function find(list, id) {
    for (var i = 0; i < list.length; i++) if (list[i].id === id) return list[i];
    return null;
  }
  function label(list, id) { var f = find(list, id); return f ? f.label : id; }
  function timeRank(id) { var t = find(TIMES, id); return t ? t.rank : 99; }

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
      if (it.status === 'done' && typeof it.rating === 'number' && it.rating >= 1) {
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
    (choice.moods || []).forEach(function (m) {
      if ((item.moods || []).indexOf(m) !== -1) {
        reasons.push({ text: label(MOODS, m), points: rules.pointsPerMood });
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
    var upNext = items.filter(function (it) { return it.status === 'next'; });
    if (!upNext.length) {
      return { picks: [], considered: 0, emptyReason: 'Your Up next list is empty. Add something first.' };
    }

    var type = choice.type && choice.type !== 'any' ? choice.type : null;
    var byType = type ? upNext.filter(function (it) { return it.type === type; }) : upNext;
    if (!byType.length) {
      return { picks: [], considered: 0, emptyReason: 'Nothing in Up next is a ' + label(TYPES, type).toLowerCase() + '.' };
    }

    var byTime = choice.time
      ? byType.filter(function (it) { return timeRank(it.time) <= timeRank(choice.time); })
      : byType;
    if (!byTime.length) {
      return {
        picks: [], considered: 0,
        emptyReason: 'Nothing' + (type ? ' that is a ' + label(TYPES, type).toLowerCase() : '') +
          ' fits in "' + label(TIMES, choice.time).toLowerCase() + '".'
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
      'Only items in Up next are considered.',
      'If you pick a type, anything of another type is left out.',
      'If you pick a time, anything longer than that time is left out. Shorter items still count.',
      '+' + rules.pointsPerMood + ' points for each mood you picked that the item has.',
      '+' + rules.trustedPoints + ' point if the person who recommended it has an average rating of ' +
        rules.trustedMinAverage.toFixed(1) + '★ or more, across at least ' + rules.trustedMinRated + ' finished picks you rated.',
      '+' + rules.waitingPoints + ' point if it has been waiting more than ' + rules.waitingMoreThanDays + ' days.',
      'Highest total wins. Ties go to whichever was added first.',
      'The top ' + rules.showTop + ' are shown, each with its math.'
    ];
  }

  var api = {
    RULES: RULES, TYPES: TYPES, TIMES: TIMES, MOODS: MOODS, DAY_MS: DAY_MS,
    label: label, personKey: personKey, recommenderStats: recommenderStats, isTrusted: isTrusted,
    daysWaiting: daysWaiting, scoreItem: scoreItem, pick: pick, explain: explain, rulesText: rulesText
  };
  if (typeof module !== 'undefined' && module.exports) module.exports = api;
  else root.MoodRules = api;
})(typeof globalThis !== 'undefined' ? globalThis : this);
