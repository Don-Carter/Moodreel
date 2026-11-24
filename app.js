/* Moodreel app: screens, saving on this device, charts, starter quiz. No network calls. */
(function () {
  'use strict';
  var R = window.MoodRules;
  var S = window.MoodStarter;
  var KEY = 'moodreel.v1';           // storage key kept from v1 so existing lists carry over
  var DAY = R.DAY_MS;
  var MAX_FAVS = 10;

  /* ---------- Saving (this device only) ---------- */
  var state = { items: [], people: [], favTags: [], quizDone: false };
  var ui = { tab: 'list', list: 'next', pick: { moods: [], time: null, type: 'any' }, editingId: null };

  function load() {
    try {
      var raw = localStorage.getItem(KEY);
      if (raw) {
        var data = JSON.parse(raw);
        if (data && Array.isArray(data.items)) state.items = data.items.filter(validItem).map(cleanItem);
        state.people = cleanPeople(data && data.people);
        state.favTags = R.cleanTags('any', data && data.favTags);
        state.quizDone = !!(data && data.quizDone);
      }
    } catch (e) { /* storage unavailable: start empty */ }
    try {
      var tab = localStorage.getItem(KEY + '.tab');
      if (tab && document.getElementById('tab-' + tab)) ui.tab = tab;
    } catch (e) { }
    ui.pick.moods = state.favTags.slice();
  }
  function save() {
    try {
      localStorage.setItem(KEY, JSON.stringify({
        version: 2, items: state.items, people: state.people, favTags: state.favTags, quizDone: state.quizDone
      }));
    } catch (e) { toast('Could not save on this device.'); }
  }
  function validItem(it) {
    return it && typeof it.title === 'string' && it.title.trim() &&
      R.TYPES.some(function (t) { return t.id === it.type; }) && typeof it.addedAt === 'number';
  }
  /* Tidy an item and bring older saved items up to date (old books become "Single book"). */
  function cleanItem(it) {
    var m = R.migrateItem(it);
    var done = m.status === 'done', progress = m.status === 'progress';
    return {
      id: String(m.id || newId()), title: String(m.title).trim().slice(0, 200), type: m.type, time: m.time,
      moods: m.moods, recBy: String(m.recBy || '').trim().slice(0, 60), status: m.status,
      rating: done ? R.cleanRating(m.rating) : null,
      addedAt: m.addedAt,
      startedAt: typeof m.startedAt === 'number' ? m.startedAt : (progress ? m.addedAt : null),
      finishedAt: done ? (typeof m.finishedAt === 'number' ? m.finishedAt : m.addedAt) : null,
      thanked: done && !!m.thanked
    };
  }
  function cleanPeople(list) {
    var out = [];
    (Array.isArray(list) ? list : []).forEach(function (n) { addName(out, n); });
    return out;
  }
  /* Add a name to a list if it's new (case-insensitive). Returns true if added. */
  function addName(list, name) {
    name = String(name || '').trim().slice(0, 60);
    if (!name) return false;
    var k = R.personKey(name);
    if (list.some(function (n) { return R.personKey(n) === k; })) return false;
    list.push(name);
    return true;
  }
  function newId() { return Date.now().toString(36) + Math.random().toString(36).slice(2, 7); }

  /* ---------- Helpers ---------- */
  function $(sel) { return document.querySelector(sel); }
  function el(tag, attrs, children) {
    var n = document.createElement(tag);
    if (attrs) Object.keys(attrs).forEach(function (k) {
      if (k === 'text') n.textContent = attrs[k];
      else if (k === 'class') n.className = attrs[k];
      else if (k.slice(0, 2) === 'on') n.addEventListener(k.slice(2), attrs[k]);
      else n.setAttribute(k, attrs[k]);
    });
    (children || []).forEach(function (c) { if (c) n.appendChild(typeof c === 'string' ? document.createTextNode(c) : c); });
    return n;
  }
  function svg(tag, attrs, text) {
    var n = document.createElementNS('http://www.w3.org/2000/svg', tag);
    Object.keys(attrs || {}).forEach(function (k) { n.setAttribute(k, attrs[k]); });
    if (text !== undefined) n.textContent = text;
    return n;
  }
  function typeOf(id) { return R.TYPES.filter(function (t) { return t.id === id; })[0]; }
  function itemById(id) { return state.items.filter(function (it) { return it.id === id; })[0]; }
  /* Five stars for a card; a half star shows half filled. */
  function starsEl(rating) {
    var box = el('span', { class: 'stars-inline', role: 'img', 'aria-label': rating + ' star' + (rating === 1 ? '' : 's') });
    for (var n = 1; n <= 5; n++) box.appendChild(el('span', { class: 'si st-' + R.starState(rating, n), 'aria-hidden': 'true', text: '★' }));
    return box;
  }
  function daysSince(t) { return Math.max(0, Math.floor((Date.now() - t) / DAY)); }
  var toastTimer;
  function toast(msg) {
    var t = $('#toast'); t.textContent = msg; t.hidden = false;
    clearTimeout(toastTimer); toastTimer = setTimeout(function () { t.hidden = true; }, 2600);
  }
  function buzz(ms) { try { if (navigator.vibrate) navigator.vibrate(ms); } catch (e) { } }

  /* Chip row: single (value) or multi (array) select. */
  function chipRow(container, options, getSelected, onToggle, multi) {
    container.innerHTML = '';
    options.forEach(function (o) {
      var sel = getSelected();
      var on = multi ? sel.indexOf(o.id) !== -1 : sel === o.id;
      container.appendChild(el('button', {
        type: 'button', class: 'chip', 'aria-pressed': on ? 'true' : 'false', text: o.label,
        onclick: function () { onToggle(o.id); chipRow(container, options, getSelected, onToggle, multi); }
      }));
    });
  }
  function toggleIn(arr, id) { var i = arr.indexOf(id); if (i === -1) arr.push(id); else arr.splice(i, 1); }

  /* Moods, then the genres that fit, each under a small label.
   * type 'any' shows the genre groups (only those touching opts.types, if given).
   * opts.max caps how many can be picked; opts.onChange runs after each tap. */
  function tagGroups(container, type, selected, opts) {
    opts = opts || {};
    container.innerHTML = '';
    var groups = [{ label: 'Moods', tags: R.MOODS }];
    if (!type || type === 'any') {
      R.GENRE_GROUPS.forEach(function (g) {
        var show = !opts.types || !opts.types.length || g.types.some(function (t) { return opts.types.indexOf(t) !== -1; });
        if (show) groups.push({ label: g.label, tags: g.genres });
      });
    } else {
      groups.push({ label: 'Genres', tags: R.genresFor(type) });
    }
    function toggle(id) {
      if (opts.max && selected.indexOf(id) === -1 && selected.length >= opts.max) { toast('You can pick up to ' + opts.max + '.'); return; }
      toggleIn(selected, id);
      tagGroups(container, type, selected, opts); // redraw all groups: one tag (like News) can sit in two groups
      if (opts.onChange) opts.onChange();
    }
    groups.forEach(function (g) {
      container.appendChild(el('div', { class: 'tag-group-label', text: g.label }));
      var row = el('div', { class: 'chips' });
      container.appendChild(row);
      chipRow(row, g.tags, function () { return selected; }, toggle, true);
    });
  }

  /* ---------- Tabs ---------- */
  var TITLES = { list: 'Moodreel', pick: 'Pick for me', people: 'People', rules: 'Rules' };
  function showTab(tab) {
    ui.tab = tab;
    try { localStorage.setItem(KEY + '.tab', tab); } catch (e) { }
    ['list', 'pick', 'people', 'rules'].forEach(function (t) {
      $('#tab-' + t).hidden = t !== tab;
      var b = document.querySelector('.tabbar [data-tab="' + t + '"]');
      if (t === tab) b.setAttribute('aria-current', 'page'); else b.removeAttribute('aria-current');
    });
    $('#screen-title').textContent = TITLES[tab];
    $('#fab-add').hidden = tab !== 'list';
    render();
    window.scrollTo(0, 0);
  }
  function render() {
    if (ui.tab === 'list') renderList();
    if (ui.tab === 'pick') renderPick();
    if (ui.tab === 'people') renderPeople();
    if (ui.tab === 'rules') renderRules();
  }

  /* ---------- List ---------- */
  var EMPTY = {
    next: ['Nothing up next yet', 'Tap “+ Add” to add something you want to watch, read or hear.'],
    progress: ['Nothing in progress', 'Watching, reading or listening to something now? Open it and set Status to “In progress”.'],
    done: ['Nothing finished yet', 'When you finish something, open it and set Status to “Finished”.']
  };
  function renderList() {
    document.querySelectorAll('.segmented button').forEach(function (b) {
      b.setAttribute('aria-selected', b.dataset.list === ui.list ? 'true' : 'false');
    });
    var box = $('#list-items'); box.innerHTML = '';
    var items = state.items.filter(function (it) { return it.status === ui.list; });
    var sorters = {
      next: function (a, b) { return a.addedAt - b.addedAt; },
      progress: function (a, b) { return (b.startedAt || 0) - (a.startedAt || 0); },
      done: function (a, b) { return (b.finishedAt || 0) - (a.finishedAt || 0); }
    };
    items.sort(sorters[ui.list]);

    if (!state.items.length) {
      box.appendChild(el('div', { class: 'empty' }, [
        el('strong', { text: 'Let’s build your list' }),
        'Take the 1-minute starter quiz to pick from popular titles, or tap “+ Add”.'
      ]));
      box.appendChild(el('button', { class: 'btn primary wide', text: 'Take the starter quiz', onclick: openQuiz }));
      box.appendChild(el('button', { class: 'btn wide', text: 'Load sample data', onclick: loadSample }));
      return;
    }
    if (!items.length) {
      box.appendChild(el('div', { class: 'empty' }, [el('strong', { text: EMPTY[ui.list][0] }), EMPTY[ui.list][1]]));
      return;
    }
    var now = Date.now();
    items.forEach(function (it) {
      var t = typeOf(it.type);
      var meta = [t.label, R.timeLabel(it.time)];
      if (it.recBy) meta.push('from ' + it.recBy);
      if (it.status === 'next') meta.push(R.daysWaiting(it, now) + 'd waiting');
      if (it.status === 'progress' && it.startedAt) meta.push('started ' + daysSince(it.startedAt) + 'd ago');
      var tell = it.status === 'done' && it.recBy && !it.thanked
        ? el('button', { type: 'button', class: 'tell-link', text: '💬 Tell ' + it.recBy,
          onclick: function (e) { e.stopPropagation(); showTell(it.id); } })
        : null;
      box.appendChild(el('div', {
        class: 'card', role: 'button', tabindex: '0', 'aria-label': 'Edit ' + it.title,
        onclick: function () { openSheet(it.id); },
        onkeydown: function (e) { if (e.target === e.currentTarget && (e.key === 'Enter' || e.key === ' ')) { e.preventDefault(); openSheet(it.id); } }
      }, [
        el('div', { class: 'card-top' }, [
          el('span', { class: 'card-icon', 'aria-hidden': 'true', text: t.icon }),
          el('span', { class: 'card-title', text: it.title }),
          it.rating ? starsEl(it.rating) : null
        ]),
        el('div', { class: 'card-meta', text: meta.join(' · ') }),
        it.moods.length ? el('div', { class: 'tags' }, it.moods.map(function (m) { return el('span', { class: 'tag', text: R.tagLabel(m) }); })) : null,
        tell
      ]));
    });
  }

  /* ---------- Pick ---------- */
  function renderPick() {
    chipRow($('#pick-type'), [{ id: 'any', label: 'Any' }].concat(R.TYPES), function () { return ui.pick.type; },
      function (id) {
        ui.pick.type = id;
        ui.pick.moods = R.cleanTags(id, ui.pick.moods); // drop genres that don't fit the new type
        var lengths = R.lengthsFor(id).map(function (t) { return t.id; });
        if (ui.pick.time && lengths.indexOf(ui.pick.time) === -1) ui.pick.time = null; // book lengths vs hours
        renderPickTime(); renderPickTags();
      }, false);
    renderPickTime();
    renderPickTags();
  }
  function renderPickTime() {
    var isBook = ui.pick.type === 'book';
    $('#pick-time-legend').firstChild.textContent = isBook ? 'How many books? ' : 'How much time? ';
    chipRow($('#pick-time'), [{ id: null, label: 'Any length' }].concat(R.lengthsFor(ui.pick.type)), function () { return ui.pick.time; },
      function (id) { ui.pick.time = id; }, false);
  }
  function renderPickTags() {
    var note = $('#pick-fav-note'); note.innerHTML = '';
    if (state.favTags.length) {
      var picked = ui.pick.moods.length > 0;
      note.appendChild(el('div', { class: 'fav-note' }, [
        el('p', { class: 'hint', text: picked ? 'Your favorites start pre-selected.' : 'Nothing selected.' }),
        el('button', { type: 'button', class: 'link', text: picked ? 'Clear' : 'Use my favorites', onclick: function () {
          ui.pick.moods = picked ? [] : R.cleanTags(ui.pick.type, state.favTags);
          renderPickTags();
        } })
      ]));
    }
    tagGroups($('#pick-tags'), ui.pick.type, ui.pick.moods, { onChange: renderPickNoteOnly });
  }
  function renderPickNoteOnly() {
    // keep the Clear / Use my favorites link in sync without redrawing the chips
    var btn = $('#pick-fav-note .link'), txt = $('#pick-fav-note .hint');
    if (!btn) return;
    var picked = ui.pick.moods.length > 0;
    btn.textContent = picked ? 'Clear' : 'Use my favorites';
    txt.textContent = picked ? 'Your favorites start pre-selected.' : 'Nothing selected.';
    btn.onclick = function () { ui.pick.moods = picked ? [] : R.cleanTags(ui.pick.type, state.favTags); renderPickTags(); };
  }
  function runPick() {
    var res = R.pick(state.items, ui.pick, Date.now());
    var box = $('#pick-results'); box.innerHTML = '';
    if (!res.picks.length) {
      box.appendChild(el('div', { class: 'notice', text: res.emptyReason }));
      return;
    }
    buzz(40);
    box.appendChild(el('p', { class: 'hint', text: res.considered + ' item' + (res.considered === 1 ? '' : 's') + ' passed the filters. Top ' + res.picks.length + ':' }));
    res.picks.forEach(function (p, i) {
      var t = typeOf(p.item.type), ex = R.explain(p);
      box.appendChild(el('div', { class: 'card result' + (i === 0 ? ' first' : '') }, [
        el('span', { class: 'rank', 'aria-label': 'Number ' + (i + 1), text: '#' + (i + 1) }),
        el('div', { class: 'card-top' }, [
          el('span', { class: 'card-icon', 'aria-hidden': 'true', text: t.icon }),
          el('span', { class: 'card-title' }, [p.item.title,
            p.item.status === 'progress' ? el('span', { class: 'badge', text: 'In progress' }) : null])
        ]),
        el('div', { class: 'card-meta', text: t.label + ' · ' + R.timeLabel(p.item.time) + (p.item.recBy ? ' · from ' + p.item.recBy : '') }),
        el('p', { class: 'math' }, [el('b', { text: ex.split(':')[0] + ':' }), ex.slice(ex.indexOf(':') + 1)])
      ]));
    });
    box.firstChild.scrollIntoView({ behavior: 'smooth', block: 'start' });
  }

  /* ---------- People + history charts ---------- */
  function allPeople() {
    var stats = R.recommenderStats(state.items);
    state.people.forEach(function (n) {
      var k = R.personKey(n);
      if (!stats[k]) stats[k] = { name: n, count: 0, rated: 0, total: 0, average: null };
    });
    return Object.keys(stats).map(function (k) { return stats[k]; });
  }
  function renderPeople() {
    var chips = $('#people-chips'); chips.innerHTML = '';
    state.people.forEach(function (n) {
      chips.appendChild(el('button', {
        type: 'button', class: 'chip person-chip', 'aria-label': 'Remove ' + n,
        onclick: function () {
          if (!confirm('Remove ' + n + ' from your people? Their name stays on anything they recommended.')) return;
          state.people = state.people.filter(function (x) { return x !== n; });
          save(); renderPeople();
        }
      }, [n, el('span', { class: 'x', 'aria-hidden': 'true', text: '×' })]));
    });

    var pc = $('#people-chart'); pc.innerHTML = '';
    var people = allPeople().sort(function (a, b) {
      return (b.average || 0) - (a.average || 0) || b.count - a.count || (a.name.toLowerCase() < b.name.toLowerCase() ? -1 : 1);
    });
    if (!people.length) {
      pc.appendChild(el('div', { class: 'empty' }, [el('strong', { text: 'No recommenders yet' }),
        'Add names above, or fill in “Recommended by” when you add something. Rate it when you finish, and their average shows up here.']));
    } else {
      pc.appendChild(peopleChart(people));
    }
    var hc = $('#history-chart'); hc.innerHTML = '';
    hc.appendChild(historyChart());
  }

  function peopleChart(people) {
    var W = 340, rowH = 36, labelW = 88, barMax = W - labelW - 92, H = people.length * rowH + 8; // room for "no picks yet"
    var s = svg('svg', { viewBox: '0 0 ' + W + ' ' + H, class: 'chart', role: 'img', 'aria-label': 'Average rating by recommender' });
    people.forEach(function (p, i) {
      var y = i * rowH + 4, trusted = R.isTrusted(p, R.RULES);
      var name = p.name.length > 12 ? p.name.slice(0, 11) + '…' : p.name;
      s.appendChild(svg('text', { x: 0, y: y + 21 }, name));
      s.appendChild(svg('rect', { x: labelW, y: y + 6, width: barMax, height: 20, rx: 5, class: 'grid', fill: 'none' }));
      if (p.average !== null) {
        s.appendChild(svg('rect', { x: labelW, y: y + 6, width: Math.max(4, barMax * p.average / 5), height: 20, rx: 5, class: trusted ? 'bar' : 'bar-dim' }));
      }
      var txt = p.average !== null ? p.average.toFixed(1) + '★ (' + p.rated + ')' : p.count ? 'not rated' : 'no picks yet';
      s.appendChild(svg('text', { x: labelW + barMax + 8, y: y + 21, class: p.average === null ? 'muted' : '' }, txt));
    });
    var wrap = el('div', {}, [s]);
    wrap.appendChild(el('p', { class: 'hint', text: 'Solid bars earn the +' + R.RULES.trustedPoints + ' bonus (' +
      R.RULES.trustedMinAverage.toFixed(1) + '★ or more across ' + R.RULES.trustedMinRated + '+ rated picks). Faded bars don’t. Number in brackets = picks you rated.' }));
    return wrap;
  }

  function historyChart() {
    var months = [], now = new Date();
    for (var i = 5; i >= 0; i--) {
      var d = new Date(now.getFullYear(), now.getMonth() - i, 1);
      months.push({ y: d.getFullYear(), m: d.getMonth(), label: d.toLocaleString(undefined, { month: 'short' }), n: 0 });
    }
    state.items.forEach(function (it) {
      if (it.status !== 'done' || !it.finishedAt) return;
      var d = new Date(it.finishedAt);
      months.forEach(function (mo) { if (mo.y === d.getFullYear() && mo.m === d.getMonth()) mo.n++; });
    });
    var max = Math.max.apply(null, months.map(function (m) { return m.n; }).concat([1]));
    var W = 340, H = 170, top = 18, base = 140, colW = W / months.length;
    var s = svg('svg', { viewBox: '0 0 ' + W + ' ' + H, class: 'chart', role: 'img', 'aria-label': 'Items finished in each of the last 6 months' });
    s.appendChild(svg('line', { x1: 0, x2: W, y1: base, y2: base, class: 'grid' }));
    months.forEach(function (mo, i) {
      var h = (base - top) * mo.n / max, x = i * colW + colW * 0.2, w = colW * 0.6;
      if (mo.n) s.appendChild(svg('rect', { x: x, y: base - h, width: w, height: h, rx: 4, class: 'bar' }));
      s.appendChild(svg('text', { x: x + w / 2, y: base - h - 5, 'text-anchor': 'middle', class: mo.n ? '' : 'muted' }, String(mo.n)));
      s.appendChild(svg('text', { x: x + w / 2, y: base + 20, 'text-anchor': 'middle', class: 'muted' }, mo.label));
    });
    var total = months.reduce(function (a, m) { return a + m.n; }, 0);
    return el('div', {}, [s, el('p', { class: 'hint', text: total + ' finished in the last 6 months, counted by the date you marked each one Finished.' })]);
  }

  /* ---------- "Tell them what you thought" ---------- */
  var tellId = null, tellCopyMode = false;
  function showTell(id) {
    var it = itemById(id);
    if (!it || !it.recBy) return;
    tellId = id; tellCopyMode = false;
    $('#tell-text').textContent = 'You finished “' + it.title + '”. Tell ' + it.recBy + ' what you thought?';
    $('#tell-msg').hidden = true;
    $('#tell-send').textContent = 'Send a message';
    $('#tell-later').textContent = 'Not now';
    /* The card already shows it was saved; don't let the "Saved." toast cover it. */
    clearTimeout(toastTimer); $('#toast').hidden = true;
    $('#tell').hidden = false;
  }
  function hideTell() { $('#tell').hidden = true; tellId = null; tellCopyMode = false; }
  /* Last resort when the phone can't share or copy: show the message to select and copy by hand. */
  function showCopyBox(it, text) {
    tellId = it.id; tellCopyMode = true;
    $('#tell-text').textContent = 'Copy this message and send it to ' + it.recBy + ':';
    var box = $('#tell-msg'); box.value = text; box.hidden = false;
    $('#tell-send').textContent = 'Done, I sent it';
    $('#tell-later').textContent = 'Not now';
    $('#tell').hidden = false;
    try { box.focus(); box.select(); } catch (e) { }
  }
  function tellMessage(it) {
    return 'I finished ' + it.title + (it.rating ? ', ' + it.rating + '★' : '') + '. Thanks for the rec!';
  }
  function markThanked(id) {
    var it = itemById(id); if (!it) return;
    it.thanked = true; save(); render();
  }
  function sendTell() {
    var it = itemById(tellId); if (!it) { hideTell(); return; }
    var id = it.id, text = tellMessage(it), who = it.recBy;
    if (tellCopyMode) { hideTell(); markThanked(id); return; } // "Done, I sent it"
    hideTell();
    // The phone's own share menu does the sending; the app never sends anything itself.
    if (navigator.share) {
      navigator.share({ text: text }).then(function () { markThanked(id); }).catch(function () { });
      return;
    }
    if (navigator.clipboard && navigator.clipboard.writeText) {
      navigator.clipboard.writeText(text).then(function () {
        markThanked(id); toast('Message copied. Paste it to ' + who + '.');
      }).catch(function () { showCopyBox(it, text); });
      return;
    }
    showCopyBox(it, text);
  }

  /* ---------- Rules + data ---------- */
  function renderRules() {
    var ol = $('#rules-list'); ol.innerHTML = '';
    R.rulesText().forEach(function (t) { ol.appendChild(el('li', { text: t })); });
  }

  function sampleItems() {
    var now = Date.now();
    function ago(days) { return now - days * DAY; }
    var raw = [
      { title: 'Paddington 2', type: 'movie', time: 'two', moods: ['cozy', 'funny', 'light', 'kids'], recBy: 'Sam', status: 'next', addedAt: ago(45) },
      { title: 'Severance', type: 'show', time: 'weekend', moods: ['mind', 'intense', 'scifi', 'mystery'], recBy: 'Priya', status: 'next', addedAt: ago(12) },
      { title: 'Project Hail Mary', type: 'book', time: 'single', moods: ['funny', 'mind', 'scifi', 'adventure'], recBy: 'Sam', status: 'next', addedAt: ago(8) },
      { title: 'The Three-Body Problem (trilogy)', type: 'book', time: 'trilogy', moods: ['mind', 'foreign', 'scifi'], recBy: 'Priya', status: 'next', addedAt: ago(18) },
      { title: 'Bluey (any episode)', type: 'show', time: 'short', moods: ['cozy', 'funny', 'light', 'kids', 'animated'], recBy: 'Alex', status: 'next', addedAt: ago(3) },
      { title: 'Past Lives', type: 'movie', time: 'two', moods: ['sad', 'romantic', 'drama'], recBy: 'Priya', status: 'next', addedAt: ago(60) },
      { title: 'The Bear', type: 'show', time: 'hour', moods: ['intense', 'drama'], recBy: 'Jordan', status: 'progress', addedAt: ago(20), startedAt: ago(4) },
      { title: 'Hereditary', type: 'movie', time: 'two', moods: ['spooky', 'intense', 'horror'], recBy: 'Jordan', status: 'next', addedAt: ago(15) },
      { title: 'Mad Max: Fury Road', type: 'movie', time: 'two', moods: ['intense', 'action', 'scifi'], recBy: 'Alex', status: 'next', addedAt: ago(35) },
      { title: 'Rumours (Fleetwood Mac)', type: 'music', time: 'hour', moods: ['upbeat', 'romantic', 'rock'], recBy: 'Sam', status: 'next', addedAt: ago(5) },
      { title: 'Kind of Blue (Miles Davis)', type: 'music', time: 'hour', moods: ['chill', 'cozy', 'jazz'], recBy: 'Priya', status: 'next', addedAt: ago(40) },
      { title: 'Serial, season 1', type: 'podcast', time: 'weekend', moods: ['intense', 'truecrime', 'storytelling'], recBy: 'Priya', status: 'progress', addedAt: ago(25), startedAt: ago(6) },
      { title: 'Lore', type: 'podcast', time: 'hour', moods: ['spooky', 'history', 'storytelling'], recBy: 'Jordan', status: 'next', addedAt: ago(2) },
      { title: 'Spirited Away', type: 'movie', time: 'two', moods: ['cozy', 'mind', 'kids', 'foreign', 'animated', 'fantasy'], recBy: 'Sam', status: 'done', rating: 5, addedAt: ago(150), finishedAt: ago(120), thanked: true },
      { title: 'Klara and the Sun', type: 'book', time: 'single', moods: ['sad', 'mind', 'scifi'], recBy: 'Sam', status: 'done', rating: 4, addedAt: ago(130), finishedAt: ago(70), thanked: true },
      { title: 'Ted Lasso', type: 'show', time: 'weekend', moods: ['funny', 'cozy'], recBy: 'Priya', status: 'done', rating: 4, addedAt: ago(100), finishedAt: ago(40), thanked: true },
      { title: 'Tenet', type: 'movie', time: 'two', moods: ['intense', 'mind', 'action', 'scifi'], recBy: 'Jordan', status: 'done', rating: 2, addedAt: ago(90), finishedAt: ago(35), thanked: true },
      { title: 'Arrival', type: 'movie', time: 'two', moods: ['mind', 'sad', 'scifi'], recBy: 'Priya', status: 'done', rating: 5, addedAt: ago(40), finishedAt: ago(10) },
      { title: 'The Midnight Library', type: 'book', time: 'single', moods: ['light', 'fantasy'], recBy: 'Jordan', status: 'done', rating: 3, addedAt: ago(30), finishedAt: ago(5), thanked: true }
    ];
    return raw.map(function (r) { r.id = newId(); return cleanItem(r); });
  }
  function loadSample() {
    var sample = sampleItems();
    if (state.items.length && !confirm('Add ' + sample.length + ' sample items to your list? Your own items stay.')) return;
    state.items = state.items.concat(sample);
    state.quizDone = true;
    save(); toast('Sample data added.');
    ui.list = 'next'; showTab('list');
  }

  function exportBackup() {
    var json = JSON.stringify({ app: 'moodreel', version: 2, exportedAt: new Date().toISOString(),
      items: state.items, people: state.people, favTags: state.favTags }, null, 2);
    var name = 'moodreel-backup-' + new Date().toISOString().slice(0, 10) + '.json';
    var file;
    try { file = new File([json], name, { type: 'application/json' }); } catch (e) { }
    if (file && navigator.canShare && navigator.canShare({ files: [file] })) {
      navigator.share({ files: [file], title: 'Moodreel backup' }).catch(function () { });
      return;
    }
    var url = URL.createObjectURL(new Blob([json], { type: 'application/json' }));
    var a = el('a', { href: url, download: name }); document.body.appendChild(a); a.click(); a.remove();
    setTimeout(function () { URL.revokeObjectURL(url); }, 1000);
    toast('Backup saved as ' + name);
  }
  function importBackup(file) {
    var reader = new FileReader();
    reader.onload = function () {
      try {
        var data = JSON.parse(reader.result);
        var items = (data && Array.isArray(data.items) ? data.items : []).filter(validItem).map(cleanItem);
        if (!items.length) throw new Error('empty');
        if (!confirm('Replace your current list (' + state.items.length + ' items) with this backup (' + items.length + ' items)?')) return;
        state.items = items;
        if (Array.isArray(data.people)) state.people = cleanPeople(data.people);
        if (Array.isArray(data.favTags)) state.favTags = R.cleanTags('any', data.favTags);
        state.quizDone = true;
        save(); toast('Restored ' + items.length + ' items.'); showTab('list');
      } catch (e) { toast('That file is not a Moodreel backup.'); }
    };
    reader.readAsText(file);
  }
  function clearAll() {
    if (!confirm('Delete all ' + state.items.length + ' items, your people and your favorites from this device? This cannot be undone unless you saved a backup.')) return;
    state = { items: [], people: [], favTags: [], quizDone: false };
    ui.pick.moods = [];
    save(); toast('Everything cleared.'); ui.list = 'next'; showTab('list');
  }

  /* ---------- Add / edit sheet ---------- */
  var draft = null;
  function openSheet(id) {
    var existing = id ? itemById(id) : null;
    ui.editingId = existing ? existing.id : null;
    draft = existing ? JSON.parse(JSON.stringify(existing))
      : { title: '', type: 'movie', time: 'two', moods: [], recBy: '', status: ui.list, rating: null };
    var f = $('#item-form');
    $('#sheet-title').textContent = existing ? 'Edit' : 'Add';
    f.title.value = draft.title; f.recBy.value = draft.recBy;
    $('#title-error').hidden = true;
    $('#btn-delete').hidden = !existing;
    var names = $('#people-names'); names.innerHTML = '';
    allPeople().forEach(function (p) { names.appendChild(el('option', { value: p.name })); });
    renderSheetChips();
    $('#sheet').hidden = false;
    document.body.style.overflow = 'hidden';
    if (!existing) setTimeout(function () { f.title.focus(); }, 50);
  }
  function renderSheetChips() {
    chipRow($('#f-type'), R.TYPES.map(function (t) { return { id: t.id, label: t.icon + ' ' + t.label }; }),
      function () { return draft.type; }, function (id) {
        draft.type = id;
        draft.moods = R.cleanTags(id, draft.moods); // genres from the old type are removed, moods stay
        draft.time = R.cleanTime(id, draft.time);   // books use Single/Trilogy/Saga, others use hours
        renderSheetTime();
        tagGroups($('#f-moods'), id, draft.moods);
      }, false);
    renderSheetTime();
    tagGroups($('#f-moods'), draft.type, draft.moods);
    chipRow($('#f-status'), R.STATUSES, function () { return draft.status; }, function (id) { draft.status = id; renderStars(); }, false);
    renderStars();
  }
  function renderSheetTime() {
    $('#f-time-legend').textContent = draft.type === 'book' ? 'How many books?' : 'How long is it?';
    chipRow($('#f-time'), R.lengthsFor(draft.type), function () { return draft.time; }, function (id) { draft.time = id; }, false);
  }
  /* Tap a star for that many stars; tap the same star again for a half star; a third tap clears it. */
  function starRow(box, get, set) {
    box.innerHTML = ''; box.setAttribute('role', 'radiogroup');
    box.setAttribute('aria-label', get() ? 'Rating: ' + get() + ' stars' : 'Rating: none');
    for (var n = 1; n <= 5; n++) (function (n) {
      box.appendChild(el('button', {
        type: 'button', role: 'radio', 'aria-label': n + ' star' + (n > 1 ? 's' : ''),
        class: 'st-' + R.starState(get() || 0, n), 'aria-checked': get() && R.starState(get(), n) !== 'empty' ? 'true' : 'false', text: '★',
        onclick: function () { set(R.nextRating(get(), n)); starRow(box, get, set); }
      }));
    })(n);
  }
  function renderStars() {
    $('#f-rating-group').hidden = draft.status !== 'done';
    starRow($('#f-rating'), function () { return draft.rating; }, function (v) { draft.rating = v; });
  }
  function closeSheet() { $('#sheet').hidden = true; document.body.style.overflow = ''; draft = null; }
  function submitSheet(e) {
    e.preventDefault();
    var f = $('#item-form');
    draft.title = f.title.value.trim(); draft.recBy = f.recBy.value.trim();
    if (!draft.title) { $('#title-error').hidden = false; f.title.focus(); return; }
    var now = Date.now(), old = ui.editingId ? itemById(ui.editingId) : null;
    var becameDone = draft.status === 'done' && (!old || old.status !== 'done');
    draft.addedAt = old ? old.addedAt : now;
    draft.startedAt = draft.status === 'progress' ? (old && old.status === 'progress' && old.startedAt ? old.startedAt : now)
      : (old ? old.startedAt : null);
    draft.finishedAt = draft.status === 'done' ? (old && old.status === 'done' && old.finishedAt ? old.finishedAt : now) : null;
    if (!old) draft.id = newId();
    var clean = cleanItem(draft);
    if (old) {
      state.items = state.items.map(function (it) { return it.id === old.id ? clean : it; });
      toast('Saved.');
    } else {
      state.items.push(clean);
      toast('Added “' + clean.title + '”.');
      ui.list = clean.status;
    }
    if (clean.recBy) addName(state.people, clean.recBy);
    save(); closeSheet(); render();
    if (becameDone && clean.recBy) showTell(clean.id);
  }
  function deleteItem() {
    var it = itemById(ui.editingId);
    if (!it || !confirm('Delete “' + it.title + '”?')) return;
    state.items = state.items.filter(function (x) { return x.id !== ui.editingId; });
    save(); closeSheet(); render(); toast('Deleted.');
  }

  /* ---------- Starter quiz ---------- */
  var quiz = null;
  var CHOICES = [
    { id: 'done', label: '✓ Seen it' },  // "Read it" for books, "Listened" for music and podcasts
    { id: 'progress', label: '▶ Watching now' },
    { id: 'next', label: '+ Want to' },
    { id: 'skip', label: 'Skip' }
  ];
  function choiceLabel(ch, type) {
    var heard = type === 'music' || type === 'podcast', book = type === 'book';
    if (ch.id === 'done') return book ? '✓ Read it' : heard ? '✓ Listened' : ch.label;
    if (ch.id === 'progress') return book ? '▶ Reading now' : heard ? '▶ Listening now' : ch.label;
    return ch.label;
  }
  var QUIZ_PAGE = 20; // cards shown at a time on step 3
  function quizMarked() {
    return Object.keys(quiz.picks).filter(function (t) { var p = quiz.picks[t]; return p.status && p.status !== 'skip'; }).length;
  }
  function quizMarkedText() {
    var n = quizMarked();
    return n === 0 ? 'Nothing marked yet. A few is enough to get picks; more makes them better.'
      : n + ' marked' + (n < 5 ? '. Mark a few more for better picks, or tap Next any time.' : '. Nice. Keep going, or tap Next any time.');
  }
  function openQuiz() {
    quiz = { step: 1, types: [], favs: state.favTags.slice(0, MAX_FAVS), picks: {}, people: state.people.slice(), shown: QUIZ_PAGE };
    $('#quiz').hidden = false;
    document.body.style.overflow = 'hidden';
    renderQuiz();
  }
  function closeQuiz() {
    $('#quiz').hidden = true; document.body.style.overflow = ''; quiz = null;
  }
  function skipQuiz() {
    state.quizDone = true; save(); closeQuiz(); render();
  }
  function quizTagType() { return quiz.types.length === 1 ? quiz.types[0] : 'any'; }
  function quizCards() {
    return S.quizOrder(S.STARTER, quiz.types, quiz.favs, state.items.map(function (it) { return it.title; }));
  }
  function renderQuiz() {
    var body = $('#quiz-body'); body.innerHTML = '';
    $('#quiz-step').textContent = 'Step ' + quiz.step + ' of 4';
    $('#quiz-back').textContent = quiz.step === 1 ? 'Skip' : 'Back';
    var last = quiz.step === 4;
    $('#quiz-next').textContent = last ? 'Finish' : 'Next';
    $('#quiz-next-bottom').textContent = last ? 'Finish' : 'Next';
    $('#quiz').scrollTop = 0;

    if (quiz.step === 1) {
      body.appendChild(el('h3', { class: 'quiz-q', text: 'What do you like?' }));
      body.appendChild(el('p', { class: 'hint', text: 'Tap any. Pick none to see everything.' }));
      var row = el('div', { class: 'chips' }); body.appendChild(row);
      chipRow(row, R.TYPES.map(function (t) { return { id: t.id, label: t.icon + ' ' + t.label }; }),
        function () { return quiz.types; }, function (id) { toggleIn(quiz.types, id); }, true);
    }

    if (quiz.step === 2) {
      body.appendChild(el('h3', { class: 'quiz-q', text: 'Pick up to ' + MAX_FAVS + ' moods & genres you like' }));
      var count = el('p', { class: 'hint' }); body.appendChild(count);
      function updateCount() {
        count.textContent = quiz.favs.length + ' of ' + MAX_FAVS + ' picked. These become your favorites on Pick for me.';
      }
      updateCount();
      var box = el('div'); body.appendChild(box);
      quiz.favs = R.cleanTags(quizTagType(), quiz.favs);
      tagGroups(box, quizTagType(), quiz.favs, { types: quiz.types, max: MAX_FAVS, onChange: updateCount });
    }

    if (quiz.step === 3) {
      var cards = quizCards();
      body.appendChild(el('h3', { class: 'quiz-q', text: 'Popular picks' }));
      body.appendChild(el('p', { class: 'hint', text: cards.length
        ? 'Tap what fits. Anything you leave alone is skipped. Best matches for your favorites come first.'
        : 'You already have every popular pick for these types. Tap Next.' }));
      if (cards.length) body.appendChild(el('p', { class: 'quiz-count', id: 'quiz-count', 'aria-live': 'polite', text: quizMarkedText() }));
      var list = el('div'); body.appendChild(list);
      function drawCards() {
        list.innerHTML = '';
        cards.slice(0, quiz.shown).forEach(function (c) { list.appendChild(quizCard(c)); });
        var left = cards.length - quiz.shown;
        if (left > 0) list.appendChild(el('button', { type: 'button', class: 'btn wide', text: 'Show ' + Math.min(left, QUIZ_PAGE) + ' more (' + left + ' left)',
          onclick: function () { quiz.shown += QUIZ_PAGE; drawCards(); } }));
      }
      drawCards();
    }

    if (quiz.step === 4) {
      body.appendChild(el('h3', { class: 'quiz-q', text: 'Who recommends things to you?' }));
      body.appendChild(el('p', { class: 'hint', text: 'Add a few names, like a friend or family member. You can choose them later under “Recommended by”.' }));
      var input = el('input', { placeholder: 'e.g. Sam', maxlength: '60', 'aria-label': 'Name' });
      var chips = el('div', { class: 'chips' });
      function drawPeople() {
        chips.innerHTML = '';
        quiz.people.forEach(function (n) {
          chips.appendChild(el('button', { type: 'button', class: 'chip person-chip', 'aria-label': 'Remove ' + n,
            onclick: function () { quiz.people = quiz.people.filter(function (x) { return x !== n; }); drawPeople(); } },
          [n, el('span', { class: 'x', 'aria-hidden': 'true', text: '×' })]));
        });
      }
      var form = el('form', { class: 'inline-form', onsubmit: function (e) {
        e.preventDefault();
        if (addName(quiz.people, input.value)) { input.value = ''; drawPeople(); }
        input.focus();
      } }, [input, el('button', { type: 'submit', class: 'btn primary', text: '+ Add' })]);
      body.appendChild(form); body.appendChild(chips);
      drawPeople();
    }
  }
  function quizCard(c) {
    var it = c.item, t = typeOf(it.type);
    var pick = quiz.picks[it.title] || { status: null, rating: null }; // untouched = nothing lit, skipped at the end
    var card = el('div', { class: 'card quiz-card' }, [
      el('div', { class: 'card-top' }, [
        el('span', { class: 'card-icon', 'aria-hidden': 'true', text: t.icon }),
        el('span', { class: 'card-title', text: it.title })
      ]),
      el('div', { class: 'card-meta', text: t.label + ' · ' + R.timeLabel(it.time) }),
      el('div', { class: 'tags' }, it.moods.map(function (m) { return el('span', { class: 'tag', text: R.tagLabel(m) }); })),
      c.matches ? el('div', { class: 'match', text: 'Matches ' + c.matches + ' of your favorites' }) : null
    ]);
    var choices = el('div', { class: 'quiz-choices', role: 'group', 'aria-label': 'What about ' + it.title + '?' });
    CHOICES.forEach(function (ch) {
      var lbl = choiceLabel(ch, it.type);
      choices.appendChild(el('button', {
        type: 'button', class: 'chip', 'aria-pressed': pick.status === ch.id ? 'true' : 'false', text: lbl,
        onclick: function () {
          var next = pick.status === ch.id ? null : ch.id; // tap again to undo
          quiz.picks[it.title] = { status: next, rating: next === 'done' ? pick.rating : null };
          card.replaceWith(quizCard(c));
          var cnt = $('#quiz-count'); if (cnt) cnt.textContent = quizMarkedText();
        }
      }));
    });
    card.appendChild(choices);
    if (pick.status === 'done') {
      var starBox = el('div', { class: 'stars', 'aria-label': 'Your rating (optional)' });
      card.appendChild(el('div', { class: 'hint', text: 'Your rating (optional). Tap a star twice for ½.' }));
      card.appendChild(starBox);
      starRow(starBox, function () { return quiz.picks[it.title].rating; }, function (v) { quiz.picks[it.title].rating = v; });
    }
    return card;
  }
  function quizNext() {
    if (quiz.step < 4) { quiz.step++; renderQuiz(); return; }
    // Finish: add chosen titles, people and favorites.
    var now = Date.now(), added = 0, first = null;
    S.STARTER.forEach(function (s) {
      var p = quiz.picks[s.title];
      if (!p || !p.status || p.status === 'skip') return;
      if (state.items.some(function (it) { return it.title.toLowerCase() === s.title.toLowerCase(); })) return;
      state.items.push(cleanItem({
        id: newId(), title: s.title, type: s.type, time: s.time, moods: s.moods.slice(), recBy: '',
        // +1 ms per title keeps the "ties go to whichever was added first" rule well defined
        status: p.status, rating: p.rating, addedAt: now + added,
        startedAt: p.status === 'progress' ? now : null, finishedAt: p.status === 'done' ? now : null,
        thanked: false
      }));
      added++;
      if (!first) first = p.status;
    });
    quiz.people.forEach(function (n) { addName(state.people, n); });
    state.favTags = R.cleanTags('any', quiz.favs);
    ui.pick.moods = state.favTags.slice();
    state.quizDone = true;
    save(); closeQuiz();
    toast(added ? 'Added ' + added + ' title' + (added === 1 ? '' : 's') + ' to your list.' : 'All set. Tap “+ Add” any time.');
    // Open the list you'll care about first: Up next if it has anything, otherwise wherever titles landed.
    ui.list = state.items.some(function (it) { return it.status === 'next'; }) ? 'next' : (first || 'next');
    showTab('list');
  }
  function quizBack() {
    if (quiz.step === 1) { skipQuiz(); return; }
    quiz.step--; renderQuiz();
  }

  /* ---------- Wire up ---------- */
  document.querySelectorAll('.tabbar button').forEach(function (b) {
    b.addEventListener('click', function () { showTab(b.dataset.tab); });
  });
  document.querySelectorAll('.segmented button').forEach(function (b) {
    b.addEventListener('click', function () { ui.list = b.dataset.list; renderList(); });
  });
  $('#fab-add').addEventListener('click', function () { openSheet(null); });
  $('#pick-go').addEventListener('click', runPick);
  $('#person-form').addEventListener('submit', function (e) {
    e.preventDefault();
    var input = $('#person-name');
    if (addName(state.people, input.value)) { save(); input.value = ''; renderPeople(); toast('Added.'); }
    else if (input.value.trim()) toast('Already on your list.');
  });
  $('#btn-quiz').addEventListener('click', openQuiz);
  $('#btn-sample').addEventListener('click', loadSample);
  $('#btn-export').addEventListener('click', exportBackup);
  $('#file-import').addEventListener('change', function (e) { if (e.target.files[0]) importBackup(e.target.files[0]); e.target.value = ''; });
  $('#btn-clear').addEventListener('click', clearAll);
  $('#sheet-cancel').addEventListener('click', closeSheet);
  $('#item-form').addEventListener('submit', submitSheet);
  $('#btn-delete').addEventListener('click', deleteItem);
  $('#quiz-next').addEventListener('click', quizNext);
  $('#quiz-next-bottom').addEventListener('click', quizNext);
  $('#quiz-back').addEventListener('click', quizBack);
  $('#tell-send').addEventListener('click', sendTell);
  $('#tell-later').addEventListener('click', hideTell);
  document.addEventListener('keydown', function (e) {
    if (e.key !== 'Escape') return;
    if (!$('#sheet').hidden) closeSheet();
    else if (!$('#tell').hidden) hideTell();
  });

  load();
  if (state.items.length) save(); // writes older saved data back in the new format (e.g. books → Single book)
  showTab(ui.tab);
  if (!state.items.length && !state.quizDone) openQuiz();

  if ('serviceWorker' in navigator && location.protocol !== 'file:') {
    window.addEventListener('load', function () { navigator.serviceWorker.register('sw.js').catch(function () { }); });
  }
})();
