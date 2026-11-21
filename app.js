/* Moodreel app: screens, saving on this device, charts. No network calls. */
(function () {
  'use strict';
  var R = window.MoodRules;
  var KEY = 'moodreel.v1';
  var DAY = R.DAY_MS;

  /* ---------- Saving (this device only) ---------- */
  var state = { items: [] };
  var ui = { tab: 'list', list: 'next', pick: { moods: [], time: null, type: 'any' }, editingId: null };

  function load() {
    try {
      var raw = localStorage.getItem(KEY);
      if (raw) {
        var data = JSON.parse(raw);
        if (data && Array.isArray(data.items)) state.items = data.items.filter(validItem);
      }
    } catch (e) { /* storage unavailable: start empty */ }
    try {
      var tab = localStorage.getItem(KEY + '.tab');
      if (tab && document.getElementById('tab-' + tab)) ui.tab = tab;
    } catch (e) { }
  }
  function save() {
    try { localStorage.setItem(KEY, JSON.stringify({ version: 1, items: state.items })); }
    catch (e) { toast('Could not save on this device.'); }
  }
  function validItem(it) {
    return it && typeof it.title === 'string' && it.title.trim() &&
      R.TYPES.some(function (t) { return t.id === it.type; }) &&
      ['short', 'hour', 'two', 'weekend'].indexOf(it.time) !== -1 &&
      ['next', 'done'].indexOf(it.status) !== -1 && typeof it.addedAt === 'number';
  }
  function cleanItem(it) {
    return {
      id: String(it.id || newId()), title: String(it.title).trim().slice(0, 200), type: it.type, time: it.time,
      moods: R.cleanTags(it.type, it.moods),
      recBy: String(it.recBy || '').trim().slice(0, 60), status: it.status,
      rating: it.status === 'done' && it.rating >= 1 && it.rating <= 5 ? Math.round(it.rating) : null,
      addedAt: it.addedAt, finishedAt: it.status === 'done' ? (typeof it.finishedAt === 'number' ? it.finishedAt : it.addedAt) : null
    };
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
  function stars(n) { return '★★★★★'.slice(0, n) + '☆☆☆☆☆'.slice(0, 5 - n); }
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

  /* Moods, then the genres that fit the type, each under a small label.
   * type 'any' shows every genre group. */
  function tagGroups(container, type, selected) {
    container.innerHTML = '';
    var groups = [{ label: 'Moods', tags: R.MOODS }];
    if (!type || type === 'any') {
      R.GENRE_GROUPS.forEach(function (g) { groups.push({ label: g.label, tags: g.genres }); });
    } else {
      groups.push({ label: 'Genres', tags: R.genresFor(type) });
    }
    groups.forEach(function (g) {
      container.appendChild(el('div', { class: 'tag-group-label', text: g.label }));
      var row = el('div', { class: 'chips' });
      container.appendChild(row);
      chipRow(row, g.tags, function () { return selected; }, function (id) { toggleIn(selected, id); }, true);
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
  function renderList() {
    document.querySelectorAll('.segmented button').forEach(function (b) {
      b.setAttribute('aria-selected', b.dataset.list === ui.list ? 'true' : 'false');
    });
    var box = $('#list-items'); box.innerHTML = '';
    var items = state.items.filter(function (it) { return it.status === ui.list; });
    items.sort(ui.list === 'next'
      ? function (a, b) { return a.addedAt - b.addedAt; }
      : function (a, b) { return (b.finishedAt || 0) - (a.finishedAt || 0); });

    if (!items.length) {
      var none = !state.items.length;
      box.appendChild(el('div', { class: 'empty' }, [
        el('strong', { text: ui.list === 'next' ? 'Nothing up next yet' : 'Nothing finished yet' }),
        none ? 'Tap “+ Add” to add a movie, show or book. Or tap “Load sample data” to try it out first.'
          : ui.list === 'next' ? 'Tap “+ Add” to add something you want to watch or read.'
            : 'When you finish something, open it and set Status to “Finished”.'
      ]));
      if (none) box.appendChild(el('button', { class: 'btn wide', text: 'Load sample data', onclick: loadSample }));
      return;
    }
    var now = Date.now();
    items.forEach(function (it) {
      var t = typeOf(it.type);
      var meta = [t.label, R.label(R.TIMES, it.time)];
      if (it.recBy) meta.push('from ' + it.recBy);
      if (it.status === 'next') meta.push(R.daysWaiting(it, now) + 'd waiting');
      box.appendChild(el('button', { class: 'card', type: 'button', 'aria-label': 'Edit ' + it.title, onclick: function () { openSheet(it.id); } }, [
        el('div', { class: 'card-top' }, [
          el('span', { class: 'card-icon', 'aria-hidden': 'true', text: t.icon }),
          el('span', { class: 'card-title', text: it.title }),
          it.rating ? el('span', { class: 'stars-inline', 'aria-label': it.rating + ' stars', text: stars(it.rating) }) : null
        ]),
        el('div', { class: 'card-meta', text: meta.join(' · ') }),
        it.moods.length ? el('div', { class: 'tags' }, it.moods.map(function (m) { return el('span', { class: 'tag', text: R.tagLabel(m) }); })) : null
      ]));
    });
  }

  /* ---------- Pick ---------- */
  function renderPick() {
    chipRow($('#pick-type'), [{ id: 'any', label: 'Any' }].concat(R.TYPES), function () { return ui.pick.type; },
      function (id) {
        ui.pick.type = id;
        ui.pick.moods = R.cleanTags(id, ui.pick.moods); // drop genres that don't fit the new type
        tagGroups($('#pick-tags'), id, ui.pick.moods);
      }, false);
    chipRow($('#pick-time'), [{ id: null, label: 'Any length' }].concat(R.TIMES), function () { return ui.pick.time; },
      function (id) { ui.pick.time = id; }, false);
    tagGroups($('#pick-tags'), ui.pick.type, ui.pick.moods);
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
      var t = typeOf(p.item.type);
      box.appendChild(el('div', { class: 'card result' + (i === 0 ? ' first' : '') }, [
        el('span', { class: 'rank', 'aria-label': 'Number ' + (i + 1), text: '#' + (i + 1) }),
        el('div', { class: 'card-top' }, [
          el('span', { class: 'card-icon', 'aria-hidden': 'true', text: t.icon }),
          el('span', { class: 'card-title', text: p.item.title })
        ]),
        el('div', { class: 'card-meta', text: t.label + ' · ' + R.label(R.TIMES, p.item.time) + (p.item.recBy ? ' · from ' + p.item.recBy : '') }),
        el('p', { class: 'math' }, [el('b', { text: R.explain(p).split(':')[0] + ':' }), R.explain(p).slice(R.explain(p).indexOf(':') + 1)])
      ]));
    });
    box.firstChild.scrollIntoView({ behavior: 'smooth', block: 'start' });
  }

  /* ---------- People + history charts ---------- */
  function renderPeople() {
    var pc = $('#people-chart'); pc.innerHTML = '';
    var stats = R.recommenderStats(state.items);
    var people = Object.keys(stats).map(function (k) { return stats[k]; })
      .sort(function (a, b) { return (b.average || 0) - (a.average || 0) || b.count - a.count || (a.name < b.name ? -1 : 1); });
    if (!people.length) {
      pc.appendChild(el('div', { class: 'empty' }, [el('strong', { text: 'No recommenders yet' }),
        'When you add something, fill in “Recommended by”. Rate it when you finish, and their average shows up here.']));
    } else {
      pc.appendChild(peopleChart(people));
    }
    var hc = $('#history-chart'); hc.innerHTML = '';
    hc.appendChild(historyChart());
  }

  function peopleChart(people) {
    var W = 340, rowH = 36, labelW = 92, barMax = W - labelW - 70, H = people.length * rowH + 8;
    var s = svg('svg', { viewBox: '0 0 ' + W + ' ' + H, class: 'chart', role: 'img', 'aria-label': 'Average rating by recommender' });
    people.forEach(function (p, i) {
      var y = i * rowH + 4, trusted = R.isTrusted(p, R.RULES);
      var name = p.name.length > 12 ? p.name.slice(0, 11) + '…' : p.name;
      s.appendChild(svg('text', { x: 0, y: y + 21 }, name));
      s.appendChild(svg('rect', { x: labelW, y: y + 6, width: barMax, height: 20, rx: 5, class: 'grid', fill: 'none' }));
      if (p.average !== null) {
        s.appendChild(svg('rect', { x: labelW, y: y + 6, width: Math.max(4, barMax * p.average / 5), height: 20, rx: 5, class: trusted ? 'bar' : 'bar-dim' }));
      }
      s.appendChild(svg('text', { x: labelW + barMax + 8, y: y + 21, class: p.average === null ? 'muted' : '' },
        p.average === null ? 'not rated' : p.average.toFixed(1) + '★ (' + p.rated + ')'));
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

  /* ---------- Rules + data ---------- */
  function renderRules() {
    var ol = $('#rules-list'); ol.innerHTML = '';
    R.rulesText().forEach(function (t) { ol.appendChild(el('li', { text: t })); });
  }

  function sampleItems() {
    var now = Date.now();
    function ago(days) { return now - days * DAY; }
    var raw = [
      { title: 'Paddington 2', type: 'movie', time: 'two', moods: ['cozy', 'funny', 'light'], recBy: 'Sam', status: 'next', addedAt: ago(45) },
      { title: 'Severance', type: 'show', time: 'weekend', moods: ['mind', 'intense', 'scifi', 'mystery'], recBy: 'Priya', status: 'next', addedAt: ago(12) },
      { title: 'Project Hail Mary', type: 'book', time: 'weekend', moods: ['funny', 'mind', 'scifi', 'adventure'], recBy: 'Sam', status: 'next', addedAt: ago(8) },
      { title: 'Bluey (any episode)', type: 'show', time: 'short', moods: ['cozy', 'funny', 'light', 'animated'], recBy: 'Alex', status: 'next', addedAt: ago(3) },
      { title: 'Past Lives', type: 'movie', time: 'two', moods: ['sad', 'romantic', 'drama'], recBy: 'Priya', status: 'next', addedAt: ago(60) },
      { title: 'The Bear', type: 'show', time: 'hour', moods: ['intense', 'drama'], recBy: 'Jordan', status: 'next', addedAt: ago(20) },
      { title: 'Hereditary', type: 'movie', time: 'two', moods: ['spooky', 'intense', 'horror'], recBy: 'Jordan', status: 'next', addedAt: ago(15) },
      { title: 'Mad Max: Fury Road', type: 'movie', time: 'two', moods: ['intense', 'action', 'scifi'], recBy: 'Alex', status: 'next', addedAt: ago(35) },
      { title: 'Rumours (Fleetwood Mac)', type: 'music', time: 'hour', moods: ['upbeat', 'romantic', 'rock'], recBy: 'Sam', status: 'next', addedAt: ago(5) },
      { title: 'Kind of Blue (Miles Davis)', type: 'music', time: 'hour', moods: ['chill', 'cozy', 'jazz'], recBy: 'Priya', status: 'next', addedAt: ago(40) },
      { title: 'Serial, season 1', type: 'podcast', time: 'weekend', moods: ['intense', 'truecrime', 'storytelling'], recBy: 'Priya', status: 'next', addedAt: ago(25) },
      { title: 'Lore', type: 'podcast', time: 'hour', moods: ['spooky', 'history', 'storytelling'], recBy: 'Jordan', status: 'next', addedAt: ago(2) },
      { title: 'Spirited Away', type: 'movie', time: 'two', moods: ['cozy', 'mind', 'animated', 'fantasy'], recBy: 'Sam', status: 'done', rating: 5, addedAt: ago(150), finishedAt: ago(120) },
      { title: 'Klara and the Sun', type: 'book', time: 'weekend', moods: ['sad', 'mind', 'scifi'], recBy: 'Sam', status: 'done', rating: 4, addedAt: ago(130), finishedAt: ago(70) },
      { title: 'Ted Lasso', type: 'show', time: 'weekend', moods: ['funny', 'cozy'], recBy: 'Priya', status: 'done', rating: 4, addedAt: ago(100), finishedAt: ago(40) },
      { title: 'Tenet', type: 'movie', time: 'two', moods: ['intense', 'mind', 'action', 'scifi'], recBy: 'Jordan', status: 'done', rating: 2, addedAt: ago(90), finishedAt: ago(35) },
      { title: 'Arrival', type: 'movie', time: 'two', moods: ['mind', 'sad', 'scifi'], recBy: 'Priya', status: 'done', rating: 5, addedAt: ago(40), finishedAt: ago(10) },
      { title: 'The Midnight Library', type: 'book', time: 'weekend', moods: ['light', 'fantasy'], recBy: 'Jordan', status: 'done', rating: 3, addedAt: ago(30), finishedAt: ago(5) }
    ];
    return raw.map(function (r) { r.id = newId(); return cleanItem(r); });
  }
  function loadSample() {
    if (state.items.length && !confirm('Add ' + sampleItems().length + ' sample items to your list? Your own items stay.')) return;
    state.items = state.items.concat(sampleItems());
    save(); toast('Sample data added.');
    ui.list = 'next'; showTab('list');
  }

  function exportBackup() {
    var json = JSON.stringify({ app: 'moodreel', version: 1, exportedAt: new Date().toISOString(), items: state.items }, null, 2);
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
        state.items = items; save(); toast('Restored ' + items.length + ' items.'); showTab('list');
      } catch (e) { toast('That file is not a Moodreel backup.'); }
    };
    reader.readAsText(file);
  }
  function clearAll() {
    if (!confirm('Delete all ' + state.items.length + ' items from this device? This cannot be undone unless you saved a backup.')) return;
    state.items = []; save(); toast('Everything cleared.'); showTab('list');
  }

  /* ---------- Add / edit sheet ---------- */
  var draft = null;
  function openSheet(id) {
    var existing = id ? state.items.filter(function (it) { return it.id === id; })[0] : null;
    ui.editingId = existing ? existing.id : null;
    draft = existing ? JSON.parse(JSON.stringify(existing))
      : { title: '', type: 'movie', time: 'two', moods: [], recBy: '', status: ui.list === 'done' ? 'done' : 'next', rating: null };
    var f = $('#item-form');
    $('#sheet-title').textContent = existing ? 'Edit' : 'Add';
    f.title.value = draft.title; f.recBy.value = draft.recBy;
    $('#title-error').hidden = true;
    $('#btn-delete').hidden = !existing;
    var names = $('#people-names'); names.innerHTML = '';
    var stats = R.recommenderStats(state.items);
    Object.keys(stats).forEach(function (k) { names.appendChild(el('option', { value: stats[k].name })); });
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
        tagGroups($('#f-moods'), id, draft.moods);
      }, false);
    chipRow($('#f-time'), R.TIMES, function () { return draft.time; }, function (id) { draft.time = id; }, false);
    tagGroups($('#f-moods'), draft.type, draft.moods);
    chipRow($('#f-status'), [{ id: 'next', label: 'Up next' }, { id: 'done', label: 'Finished' }],
      function () { return draft.status; }, function (id) { draft.status = id; renderStars(); }, false);
    renderStars();
  }
  function renderStars() {
    var g = $('#f-rating-group'); g.hidden = draft.status !== 'done';
    var box = $('#f-rating'); box.innerHTML = ''; box.setAttribute('role', 'radiogroup');
    for (var n = 1; n <= 5; n++) (function (n) {
      box.appendChild(el('button', {
        type: 'button', role: 'radio', 'aria-label': n + ' star' + (n > 1 ? 's' : ''),
        'aria-checked': draft.rating && n <= draft.rating ? 'true' : 'false', text: '★',
        onclick: function () { draft.rating = draft.rating === n ? null : n; renderStars(); }
      }));
    })(n);
  }
  function closeSheet() { $('#sheet').hidden = true; document.body.style.overflow = ''; draft = null; }
  function submitSheet(e) {
    e.preventDefault();
    var f = $('#item-form');
    draft.title = f.title.value.trim(); draft.recBy = f.recBy.value.trim();
    if (!draft.title) { $('#title-error').hidden = false; f.title.focus(); return; }
    var now = Date.now();
    if (ui.editingId) {
      var old = state.items.filter(function (it) { return it.id === ui.editingId; })[0];
      draft.addedAt = old.addedAt;
      draft.finishedAt = draft.status === 'done' ? (old.status === 'done' && old.finishedAt ? old.finishedAt : now) : null;
      var clean = cleanItem(draft);
      state.items = state.items.map(function (it) { return it.id === ui.editingId ? clean : it; });
      toast('Saved.');
    } else {
      draft.id = newId(); draft.addedAt = now; draft.finishedAt = draft.status === 'done' ? now : null;
      state.items.push(cleanItem(draft));
      toast('Added “' + draft.title + '”.');
      ui.list = draft.status;
    }
    save(); closeSheet(); render();
  }
  function deleteItem() {
    var it = state.items.filter(function (x) { return x.id === ui.editingId; })[0];
    if (!it || !confirm('Delete “' + it.title + '”?')) return;
    state.items = state.items.filter(function (x) { return x.id !== ui.editingId; });
    save(); closeSheet(); render(); toast('Deleted.');
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
  $('#btn-sample').addEventListener('click', loadSample);
  $('#btn-export').addEventListener('click', exportBackup);
  $('#file-import').addEventListener('change', function (e) { if (e.target.files[0]) importBackup(e.target.files[0]); e.target.value = ''; });
  $('#btn-clear').addEventListener('click', clearAll);
  $('#sheet-cancel').addEventListener('click', closeSheet);
  $('#item-form').addEventListener('submit', submitSheet);
  $('#btn-delete').addEventListener('click', deleteItem);
  document.addEventListener('keydown', function (e) { if (e.key === 'Escape' && !$('#sheet').hidden) closeSheet(); });

  load();
  showTab(ui.tab);

  if ('serviceWorker' in navigator && location.protocol !== 'file:') {
    window.addEventListener('load', function () { navigator.serviceWorker.register('sw.js').catch(function () { }); });
  }
})();
