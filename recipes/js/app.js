/* ============================================================
   app.js — Family Recipe Book
   Hash-routed single page. No framework, no build step.
   ============================================================ */
(function () {
  'use strict';

  var KEY = {
    custom: 'frb:custom',
    fav:    'frb:fav',
    recent: 'frb:recent',
    ticks:  'frb:ticks:'
  };

  var DATA = { categories: [], reference: {}, recipes: [] };
  var PHOTOS = {};
  var CATMAP = {};
  var state = { q: '', cat: 'all' };
  var wakeLock = null;

  /* ---------- storage helpers (never throw) ---------- */

  function load(key, fallback) {
    try {
      var raw = localStorage.getItem(key);
      return raw ? JSON.parse(raw) : fallback;
    } catch (e) { return fallback; }
  }
  function save(key, value) {
    try { localStorage.setItem(key, JSON.stringify(value)); return true; }
    catch (e) { return false; }
  }

  function favs()  { return load(KEY.fav, []); }
  function isFav(id) { return favs().indexOf(id) !== -1; }
  function toggleFav(id) {
    var f = favs(), i = f.indexOf(id);
    if (i === -1) f.unshift(id); else f.splice(i, 1);
    save(KEY.fav, f);
    return i === -1;
  }
  function pushRecent(id) {
    var r = load(KEY.recent, []).filter(function (x) { return x !== id; });
    r.unshift(id);
    save(KEY.recent, r.slice(0, 12));
  }

  /* ---------- utils ---------- */

  function esc(s) {
    return String(s == null ? '' : s)
      .replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;')
      .replace(/"/g, '&quot;').replace(/'/g, '&#39;');
  }
  function $(sel, root) { return (root || document).querySelector(sel); }
  function byId(id) { return document.getElementById(id); }

  var toastTimer;
  function toast(msg) {
    var t = byId('toast');
    t.textContent = msg;
    t.classList.add('show');
    clearTimeout(toastTimer);
    toastTimer = setTimeout(function () { t.classList.remove('show'); }, 2400);
  }

  function catName(id) { return CATMAP[id] ? CATMAP[id].name : id; }

  var CAT_COLOR = {
    rice:     '#c98a2b',
    dal:      '#2f5d3f',
    curries:  '#c4452d',
    breads:   '#9a5b2c',
    chutneys: '#4a7d4f',
    snacks:   '#b3562f',
    sweets:   '#a6538c',
    keepers:  '#5b6f8c'
  };
  var CAT_COLOR_DARK = {
    rice:     '#e2b45f',
    dal:      '#7fb98d',
    curries:  '#ef7a5f',
    breads:   '#d09a63',
    chutneys: '#8fc796',
    snacks:   '#e29468',
    sweets:   '#d792c1',
    keepers:  '#9db2cf'
  };
  function isDark() {
    var attr = document.documentElement.getAttribute('data-theme');
    if (attr === 'dark') return true;
    if (attr === 'light') return false;
    return window.matchMedia && window.matchMedia('(prefers-color-scheme: dark)').matches;
  }
  function catColor(id) {
    return (isDark() ? CAT_COLOR_DARK : CAT_COLOR)[id] || (isDark() ? '#7fb98d' : '#2f5d3f');
  }

  /* ---------- data ---------- */

  function allRecipes() {
    return DATA.recipes.concat(load(KEY.custom, []));
  }
  function findRecipe(id) {
    var all = allRecipes();
    for (var i = 0; i < all.length; i++) if (all[i].id === id) return all[i];
    return null;
  }

  function haystack(r) {
    if (r._hay) return r._hay;
    var parts = [r.title].concat(r.alt || []);
    parts.push(catName(r.category));
    (r.ingredients || []).forEach(function (i) { parts.push(i.item); });
    r._hay = parts.join(' ').toLowerCase();
    return r._hay;
  }

  function filtered() {
    var q = state.q.trim().toLowerCase();
    var terms = q ? q.split(/\s+/) : [];
    return allRecipes().filter(function (r) {
      if (state.cat !== 'all' && r.category !== state.cat) return false;
      if (!terms.length) return true;
      var hay = haystack(r);
      return terms.every(function (t) { return hay.indexOf(t) !== -1; });
    });
  }

  /* ---------- icons ---------- */

  var ICON = {
    star: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"><path d="M12 17.3l-6.2 3.6 1.6-7L2 9.2l7.1-.6L12 2l2.9 6.6 7.1.6-5.4 4.7 1.6 7z"/></svg>',
    starFill: '<svg viewBox="0 0 24 24" fill="currentColor" stroke="currentColor" stroke-width="1.8" stroke-linejoin="round"><path d="M12 17.3l-6.2 3.6 1.6-7L2 9.2l7.1-.6L12 2l2.9 6.6 7.1.6-5.4 4.7 1.6 7z"/></svg>',
    back: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M15 18l-6-6 6-6"/></svg>',
    flame: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"><path d="M12 2s5 4.5 5 9a5 5 0 0 1-10 0c0-1.5.7-2.8 1.5-3.8C9 9 12 8 12 2z"/><path d="M8.5 14.5a3.5 3.5 0 0 0 7 0"/></svg>',
    check: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="3" stroke-linecap="round" stroke-linejoin="round"><path d="M20 6L9 17l-5-5"/></svg>',
    mBowl: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-linecap="round" stroke-linejoin="round"><path d="M3 10h18c0 5-4 9-9 9s-9-4-9-9z"/><path d="M6 10c2-1.4 4-1.4 6 0s4 1.4 6 0"/></svg>',
    mList: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-linecap="round" stroke-linejoin="round"><path d="M9 6h12M9 12h12M9 18h12"/><circle cx="4.5" cy="6" r="1"/><circle cx="4.5" cy="12" r="1"/><circle cx="4.5" cy="18" r="1"/></svg>',
    mPot: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-linecap="round" stroke-linejoin="round"><path d="M4 9h16v6a4 4 0 0 1-4 4H8a4 4 0 0 1-4-4V9z"/><path d="M2 9h20"/><path d="M12 5V3"/><circle cx="12" cy="5" r="1.2"/></svg>',
    link: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"><path d="M10 13a5 5 0 0 0 7 0l3-3a5 5 0 0 0-7-7l-1.5 1.5"/><path d="M14 11a5 5 0 0 0-7 0l-3 3a5 5 0 0 0 7 7L12.5 19"/></svg>'
  };


  /* ---------- line art, drawn per category, used when there is no photo ---------- */

  var ART = {
    rice:     '<path d="M36 60c0-13 11-23 24-23s24 10 24 23"/><path d="M24 60h72"/><path d="M24 60c0 7 6 12 14 12h44c8 0 14-5 14-12"/><path d="M53 28c-4-4 3-7-1-11M68 28c-4-4 3-7-1-11"/>',
    dal:      '<path d="M26 44h68c0 15-12 27-27 27H53c-15 0-27-12-27-27z"/><path d="M33 44c9-5 18-5 27 0s18 5 27 0"/><path d="M52 30c-4-4 3-7-1-11M68 30c-4-4 3-7-1-11"/>',
    curries:  '<path d="M30 40h60v12c0 12-10 21-22 21H52c-12 0-22-9-22-21V40z"/><path d="M24 40h72"/><path d="M90 46h10c4 0 4 8 0 8h-8"/><circle cx="52" cy="52" r="2.5"/><circle cx="66" cy="57" r="2.5"/>',
    breads:   '<circle cx="60" cy="46" r="24"/><circle cx="52" cy="40" r="2"/><circle cx="66" cy="44" r="2"/><circle cx="58" cy="54" r="2"/><path d="M22 74h76"/>',
    chutneys: '<path d="M40 42h40v10c0 12-9 21-20 21s-20-9-20-21V42z"/><path d="M34 42h52"/><path d="M74 36l12-16"/><circle cx="88" cy="17" r="4"/>',
    snacks:   '<circle cx="46" cy="46" r="12"/><circle cx="74" cy="42" r="12"/><circle cx="60" cy="62" r="12"/><path d="M22 76h76"/>',
    sweets:   '<path d="M28 46h64c0 14-11 25-25 25H53c-14 0-25-11-25-25z"/><path d="M35 46c9-6 17-2 25 0s16 6 25 0"/><circle cx="50" cy="34" r="2.5"/><circle cx="62" cy="29" r="2.5"/><circle cx="73" cy="35" r="2.5"/>',
    keepers:  '<path d="M44 20v22c0 5-8 5-8 0V20M40 20v50"/><path d="M76 20c8 0 10 8 10 14s-4 8-8 8v28"/>'
  };

  function artSVG(cat) {
    var inner = ART[cat] || ART.dal;
    return '<svg viewBox="0 0 120 90" fill="none" stroke="currentColor" stroke-width="1.3" ' +
      'stroke-linecap="round" stroke-linejoin="round" aria-hidden="true" ' +
      'style="color:var(--ink-faint);opacity:.55;padding:12%">' + inner + '</svg>';
  }

  function photoOf(id) { return PHOTOS[id] || null; }

  function mediaHTML(r) {
    var p = photoOf(r.id);
    if (p) return '<img src="' + esc(p.file) + '" alt="' + esc(r.title) + '" loading="lazy" />';
    return artSVG(r.category);
  }

  function creditHTML(id) {
    var p = photoOf(id);
    if (!p) return '<figcaption>Drawn placeholder. Add your own photo and it takes over.</figcaption>';
    var who = p.author || 'Unknown';
    return '<figcaption>Photo: ' + esc(who) + ', ' + esc(p.license) +
      (p.source ? ' · <a href="' + esc(p.source) + '" target="_blank" rel="noopener noreferrer">Wikimedia Commons</a>' : '') +
      '</figcaption>';
  }

  /* ---------- card ---------- */

  function cardHTML(r) {
    var fav = isFav(r.id);
    var alt = (r.alt || []).slice(0, 2).join(' · ');
    var badge = '';
    if (r.source === 'needs-checking') badge = '<span class="badge badge--check">Check</span>';
    else if (r.source === 'added') badge = '<span class="badge badge--added">Added</span>';

    return '' +
      '<div class="card">' +
        '<a href="#/r/' + esc(r.id) + '" style="display:flex;flex-direction:column;flex:1">' +
          '<span class="card-media">' + mediaHTML(r) + '</span>' +
          '<span class="card-inner">' +
            '<span class="card-cat caps">' + esc(catName(r.category)) + '</span>' +
            '<h3>' + esc(r.title) + '</h3>' +
            (alt ? '<span class="card-alt">' + esc(alt) + '</span>' : '') +
            '<span class="card-foot">' +
              (r.cooker ? '<span class="badge badge--cooker">' + esc(r.cooker) + '</span>' : '') +
              badge +
              '<span>' + (r.steps || []).length + ' steps</span>' +
            '</span>' +
          '</span>' +
        '</a>' +
        '<button class="card-fav' + (fav ? ' is-fav' : '') + '" data-fav="' + esc(r.id) + '" ' +
          'aria-label="' + (fav ? 'Remove from favourites' : 'Add to favourites') + '" aria-pressed="' + fav + '">' +
          (fav ? ICON.starFill : ICON.star) +
        '</button>' +
      '</div>';
  }

  function gridHTML(list) {
    return '<div class="grid">' + list.map(cardHTML).join('') + '</div>';
  }

  /* ---------- views ---------- */

  function viewBrowse() {
    showControls(true);
    var list = filtered();
    var main = byId('main');

    if (!list.length) {
      main.innerHTML = '<div class="view"><div class="empty">' +
        '<h2>Nothing here</h2>' +
        '<p>No recipe matches ' + (state.q ? '&ldquo;' + esc(state.q) + '&rdquo;' : 'that filter') +
        '. Try a shorter word, or the name in another language.</p></div></div>';
      setFoot(0);
      return;
    }

    var html = '<div class="view">';

    // Recently cooked, only on the unfiltered view
    if (!state.q && state.cat === 'all') {
      var recent = load(KEY.recent, []).map(findRecipe).filter(Boolean).slice(0, 4);
      if (recent.length) {
        html += '<div class="section-head"><h2>Recently cooked</h2></div>' + gridHTML(recent);
      }
    }

    if (state.cat === 'all' && !state.q) {
      DATA.categories.forEach(function (c) {
        var inCat = list.filter(function (r) { return r.category === c.id; });
        if (!inCat.length) return;
        html += '<div class="section-head"><h2>' + esc(c.name) + '</h2>' +
                '<span class="count caps">' + inCat.length + '</span></div>' + gridHTML(inCat);
      });
    } else {
      html += '<div class="section-head"><h2>' +
        (state.q ? 'Results' : esc(catName(state.cat))) + '</h2>' +
        '<span class="count caps">' + list.length + '</span></div>' + gridHTML(list);
    }

    html += '</div>';
    main.innerHTML = html;
    setFoot(allRecipes().length);
  }

  function viewFavourites() {
    showControls(false);
    var list = favs().map(findRecipe).filter(Boolean);
    var main = byId('main');
    if (!list.length) {
      main.innerHTML = '<div class="view">' + backLink('#/', 'All recipes') +
        '<div class="empty"><h2>No favourites yet</h2>' +
        '<p>Tap the star on any recipe and it will wait for you here.</p></div></div>';
      setFoot(0);
      return;
    }
    main.innerHTML = '<div class="view">' + backLink('#/', 'All recipes') +
      '<div class="section-head"><h2>Favourites</h2><span class="count">' + list.length + '</span></div>' +
      gridHTML(list) + '</div>';
    setFoot(allRecipes().length);
  }

  function backLink(href, label) {
    return '<a class="back" href="' + href + '">' + ICON.back + esc(label) + '</a>';
  }

  function viewRecipe(id) {
    showControls(false);
    var r = findRecipe(id);
    var main = byId('main');
    if (!r) {
      main.innerHTML = '<div class="view">' + backLink('#/', 'All recipes') +
        '<div class="empty"><h2>Not found</h2><p>That recipe is not in the book.</p></div></div>';
      return;
    }

    pushRecent(id);
    var fav = isFav(id);

    // meta strip, in the manner of a printed recipe card
    var meta = [
      { icon: ICON.mBowl, label: 'Ingredients', value: (r.ingredients || []).length + ' items' },
      { icon: ICON.mList, label: 'Method',      value: (r.steps || []).length + ' steps' }
    ];
    if (r.cooker) meta.push({ icon: ICON.mPot, label: 'Cooker', value: r.cooker });
    var metaHTML = meta.map(function (m) {
      return '<div class="meta-item">' + m.icon +
        '<div><span class="m-label caps">' + esc(m.label) + '</span>' +
        '<span class="m-value">' + esc(m.value) + '</span></div></div>';
    }).join('');

    var warn = '';
    if (r.source === 'needs-checking') {
      warn = '<div class="note-block"><strong>Not from the family notes.</strong> ' +
        'This was only a heading with nothing under it, so it has been filled in from a standard recipe. ' +
        'Check it before you trust it.</div>';
    }

    var notes = '';
    if ((r.notes || []).length || (r.variants || []).length || r.link) {
      notes = '<div class="sheet-notes">' +
        (r.notes || []).map(function (n, i) {
          return '<p>' + (i === 0 ? '<span class="lead-in">Notes: </span>' : '') + esc(n) + '</p>';
        }).join('') +
        (r.variants || []).map(function (v) {
          return '<div class="variant"><strong>' + esc(v.label) + '</strong>' + esc(v.text) + '</div>';
        }).join('') +
        (r.link ? '<div class="variant"><strong>Source</strong>' +
          '<a class="src-link" href="' + esc(r.link) + '" target="_blank" rel="noopener noreferrer">' +
          ICON.link + 'Open the original</a></div>' : '') +
      '</div>';
    }

    main.innerHTML = '<div class="view">' +
      backLink(history.length > 1 ? 'javascript:history.back()' : '#/', 'Back') +
      '<article class="sheet">' +
        '<header class="sheet-head">' +
          '<span class="eyebrow caps">' + esc(catName(r.category)) + '</span>' +
          '<h1>' + esc(r.title) + '</h1>' +
          ((r.alt || []).length ? '<p class="alt">' + esc(r.alt.join(' · ')) + '</p>' : '') +
        '</header>' +

        '<div class="sheet-meta">' + metaHTML + '</div>' +

        warn +

        '<div class="sheet-body">' +
          '<aside class="col-left">' +
            '<h2>Ingredients</h2>' +
            '<ul class="ing-list">' +
              (r.ingredients || []).map(function (i) {
                return '<li>' + esc(i.item) +
                  (i.qty ? ' <span class="q">· ' + esc(i.qty) + '</span>' : '') + '</li>';
              }).join('') +
            '</ul>' +
            notes +
          '</aside>' +

          '<div class="col-right">' +
            '<figure class="sheet-photo">' +
              '<div class="frame">' + mediaHTML(r) + '</div>' +
              creditHTML(r.id) +
            '</figure>' +
            '<div class="prep-block">' +
              '<h2>Preparation</h2>' +
              '<ol class="step-list">' +
                (r.steps || []).map(function (st, n) {
                  return '<li><span class="s-n">Step ' + (n + 1) + '</span>' + esc(st) + '</li>';
                }).join('') +
              '</ol>' +
            '</div>' +
          '</div>' +
        '</div>' +

        '<div class="sheet-actions">' +
          '<a class="btn" href="#/r/' + esc(r.id) + '/cook">' + ICON.flame + 'Cook this</a>' +
          '<button class="btn btn--ghost" data-fav="' + esc(r.id) + '" aria-pressed="' + fav + '">' +
            (fav ? ICON.starFill : ICON.star) + (fav ? 'Favourited' : 'Favourite') +
          '</button>' +
        '</div>' +
      '</article>' +
    '</div>';

    setFoot(allRecipes().length);
    window.scrollTo(0, 0);
  }

  function viewReference() {
    showControls(false);
    var ref = DATA.reference || {};
    var rows = (ref.cooker || []).map(function (c) {
      return '<dt>' + esc(c.what) + '</dt><dd>' + esc(c.whistles) + '</dd>';
    }).join('');
    var links = (ref.links || []).map(function (l) {
      return '<a class="src-link" href="' + esc(l.url) + '" target="_blank" rel="noopener noreferrer">' +
        ICON.link + esc(l.label) + '</a>';
    }).join('<br>');

    byId('main').innerHTML = '<div class="view">' + backLink('#/', 'All recipes') +
      '<div class="section-head"><h2>Kitchen reference</h2></div>' +
      '<div class="ref-grid">' +
        '<div class="ref-card"><h3>The tadka, in order</h3>' +
          '<p class="tadka-flow">' + esc(ref.tadka || '') + '</p></div>' +
        '<div class="ref-card"><h3>Pressure cooker</h3><dl>' + rows + '</dl></div>' +
        (links ? '<div class="ref-card"><h3>Links worth keeping</h3>' + links + '</div>' : '') +
      '</div></div>';
    setFoot(allRecipes().length);
  }

  function setFoot(n) {
    var foot = byId('foot');
    byId('footCount').textContent = n ? n + ' recipes' : '';
    foot.hidden = false;
  }

  function showControls(show) {
    byId('browseControls').hidden = !show;
  }

  /* ---------- cook mode ---------- */

  function openCook(id) {
    var r = findRecipe(id);
    if (!r) { location.hash = '#/'; return; }

    var ticks = load(KEY.ticks + id, { ing: [], step: [] });
    var panel = byId('cook');

    byId('cookTitle').textContent = r.title;

    function tickHTML(text, kind, i, done) {
      return '<button class="tick' + (done ? ' done' : '') + '" data-kind="' + kind + '" data-i="' + i + '">' +
        '<span class="tick-box">' + ICON.check + '</span>' +
        '<span class="tick-text">' + text + '</span></button>';
    }

    byId('cookIng').innerHTML = (r.ingredients || []).map(function (ing, i) {
      var text = esc(ing.item) + (ing.qty ? ' <span style="color:var(--ink-faint)">· ' + esc(ing.qty) + '</span>' : '');
      return tickHTML(text, 'ing', i, ticks.ing.indexOf(i) !== -1);
    }).join('');

    byId('cookSteps').innerHTML = (r.steps || []).map(function (s, i) {
      return tickHTML('<strong style="color:var(--leaf)">' + (i + 1) + '.</strong> ' + esc(s),
        'step', i, ticks.step.indexOf(i) !== -1);
    }).join('');

    panel.hidden = false;
    document.body.style.overflow = 'hidden';
    panel.querySelector('.cook-body').scrollTop = 0;
    updateProgress(r, ticks);
    requestWakeLock();

    panel.onclick = function (e) {
      // Browsers reject a wake lock requested while the page is hidden or with no
      // user gesture behind it. A tap in here is both, so try again on every tap.
      if (!wakeLock) requestWakeLock();

      var btn = e.target.closest('.tick');
      if (!btn) return;
      var kind = btn.dataset.kind, i = Number(btn.dataset.i);
      var arr = ticks[kind], at = arr.indexOf(i);
      if (at === -1) { arr.push(i); btn.classList.add('done'); }
      else { arr.splice(at, 1); btn.classList.remove('done'); }
      save(KEY.ticks + id, ticks);
      updateProgress(r, ticks);
    };

    byId('cookReset').onclick = function () {
      ticks = { ing: [], step: [] };
      save(KEY.ticks + id, ticks);
      Array.prototype.forEach.call(panel.querySelectorAll('.tick'), function (b) { b.classList.remove('done'); });
      updateProgress(r, ticks);
      toast('Cleared');
    };
  }

  function updateProgress(r, ticks) {
    var total = (r.steps || []).length;
    var done = ticks.step.length;
    byId('cookBar').style.width = total ? Math.round((done / total) * 100) + '%' : '0%';
    byId('cookCount').textContent = done + '/' + total;
  }

  function closeCook() {
    byId('cook').hidden = true;
    document.body.style.overflow = '';
    releaseWakeLock();
  }

  function requestWakeLock() {
    var el = byId('cookWake');
    if (!('wakeLock' in navigator)) { el.textContent = ''; el.classList.remove('on'); return; }
    if (document.visibilityState !== 'visible') return;
    navigator.wakeLock.request('screen').then(function (lock) {
      wakeLock = lock;
      el.textContent = 'Screen on';
      el.classList.add('on');
      lock.addEventListener('release', function () {
        wakeLock = null;
        el.classList.remove('on');
      });
    }).catch(function () {
      el.textContent = '';
      el.classList.remove('on');
    });
  }
  function releaseWakeLock() {
    if (wakeLock) { try { wakeLock.release(); } catch (e) {} wakeLock = null; }
  }
  document.addEventListener('visibilitychange', function () {
    if (document.visibilityState === 'visible' && !byId('cook').hidden) requestWakeLock();
  });

  /* ---------- add from a link ---------- */

  var draft = null;

  function viewAdd() {
    showControls(false);
    var opts = DATA.categories.map(function (c) {
      return '<option value="' + esc(c.id) + '">' + esc(c.name) + '</option>';
    }).join('');

    byId('main').innerHTML = '<div class="view form">' + backLink('#/', 'All recipes') +
      '<div class="section-head"><h2>Add from a link</h2></div>' +

      '<div class="note-block">' +
        '<strong>How this works.</strong> A page on a plain website is not allowed to read Instagram or YouTube directly, ' +
        'so the recipe text has to be pasted in. Paste the link and the caption together and it will be sorted into ' +
        'ingredients and steps for you to correct.' +
      '</div>' +

      '<div class="field">' +
        '<label for="capUrl">Link</label>' +
        '<div class="hint">A reel, a video, a blog post. YouTube links fill in their own title and thumbnail.</div>' +
        '<input id="capUrl" type="url" inputmode="url" placeholder="https://" autocomplete="off" />' +
      '</div>' +
      '<div id="capPreview"></div>' +
      '<div class="status" id="capStatus"></div>' +

      '<div class="field">' +
        '<label for="capText">Caption or description</label>' +
        '<div class="hint">Paste the whole thing. Headings like Ingredients and Method are picked up if they are there.</div>' +
        '<textarea id="capText" placeholder="1 cup besan&#10;2 tbsp curd&#10;&#10;Method&#10;Whisk the batter until smooth…"></textarea>' +
      '</div>' +

      '<button class="btn btn--full" id="capParse">Sort this into a recipe</button>' +
      '<div id="capResult"></div>' +
    '</div>';

    var urlInput = byId('capUrl');
    var timer;
    urlInput.addEventListener('input', function () {
      clearTimeout(timer);
      timer = setTimeout(lookupUrl, 500);
    });
    byId('capParse').addEventListener('click', doParse);

    var pre = readPrefill();
    if (pre.url) { urlInput.value = pre.url; lookupUrl(); }
    if (pre.text) byId('capText').value = pre.text;
    if (pre.url && pre.text) doParse();
  }

  // Lets an iOS Shortcut hand us a URL and caption: #/add?url=…&text=…
  function readPrefill() {
    var hash = location.hash || '';
    var qi = hash.indexOf('?');
    if (qi === -1) return {};
    var p = new URLSearchParams(hash.slice(qi + 1));
    return { url: p.get('url') || '', text: p.get('text') || '' };
  }

  function lookupUrl() {
    var url = byId('capUrl').value.trim();
    var box = byId('capPreview');
    var status = byId('capStatus');
    box.innerHTML = '';
    status.className = 'status';
    status.textContent = '';
    if (!url) return;

    var info = Capture.identify(url);
    if (info.kind === 'none') { status.textContent = 'That does not look like a link.'; status.className = 'status err'; return; }

    if (info.kind === 'instagram') {
      status.textContent = 'Instagram does not let a page read its captions. Paste the caption below and the link will be saved with it.';
      return;
    }
    if (info.kind === 'web') {
      status.textContent = 'The link will be saved. Paste the recipe text below.';
      return;
    }

    status.textContent = 'Looking up…';
    Capture.fetchMeta(url).then(function (meta) {
      status.textContent = meta.title
        ? 'Found it. The description still has to be pasted, YouTube does not hand that over.'
        : 'Saved the link. Could not reach YouTube for the title, so type it in below.';
      box.innerHTML = '<div class="preview-card">' +
        (meta.thumbnail ? '<img src="' + esc(meta.thumbnail) + '" alt="" loading="lazy" />' : '') +
        '<div><div class="t">' + esc(meta.title || 'Untitled') + '</div>' +
        '<div class="u">' + esc(meta.author || url) + '</div></div></div>';
      if (meta.title) box.dataset.title = meta.title;
    });
  }

  function doParse() {
    var url = byId('capUrl').value.trim();
    var text = byId('capText').value;
    var result = byId('capResult');

    if (!text.trim()) {
      result.innerHTML = '<div class="status err">Paste the caption first, there is nothing to sort yet.</div>';
      return;
    }

    var parsed = Capture.parseText(text);
    var firstLine = (text.trim().split('\n')[0] || '').replace(/^#+\s*/, '').trim();
    var guessTitle = (byId('capPreview').dataset.title || '').trim() || firstLine.slice(0, 60);

    // A caption usually opens with the dish name. The parser has no way to know
    // that, so it lands in the ingredients. Pull it back out.
    if (parsed.ingredients.length && firstLine) {
      var first = parsed.ingredients[0];
      if (!first.qty && first.item === firstLine) parsed.ingredients.shift();
    }

    var opts = DATA.categories.map(function (c) {
      return '<option value="' + esc(c.id) + '"' + (c.id === 'keepers' ? ' selected' : '') + '>' + esc(c.name) + '</option>';
    }).join('');

    result.innerHTML =
      '<h2 style="font-family:var(--serif);font-size:1.5rem;margin:2rem 0 1rem">Check it over</h2>' +
      '<div class="field"><label for="edTitle">Name</label><input id="edTitle" value="' + esc(guessTitle) + '" /></div>' +
      '<div class="field"><label for="edCat">Category</label><select id="edCat">' + opts + '</select></div>' +
      '<div class="field"><label for="edIng">Ingredients</label>' +
        '<div class="hint">One per line. Use a dash to separate the thing from the amount.</div>' +
        '<textarea id="edIng">' + esc(parsed.ingredients.map(function (i) {
          return i.qty ? i.item + ' - ' + i.qty : i.item;
        }).join('\n')) + '</textarea></div>' +
      '<div class="field"><label for="edSteps">Method</label>' +
        '<div class="hint">One step per line.</div>' +
        '<textarea id="edSteps">' + esc(parsed.steps.join('\n')) + '</textarea></div>' +
      '<div class="field"><label for="edNotes">Notes</label>' +
        '<textarea id="edNotes" style="min-height:80px">' + esc(parsed.notes.join('\n')) + '</textarea></div>' +
      '<button class="btn btn--full" id="capSave">Save to the book</button>' +
      '<div class="status" id="capSaved"></div>' +
      '<div id="capExport"></div>';

    byId('capSave').addEventListener('click', function () { saveDraft(url); });
    result.scrollIntoView({ behavior: 'smooth', block: 'start' });
  }

  function linesOf(id) {
    return byId(id).value.split('\n').map(function (s) { return s.trim(); }).filter(Boolean);
  }

  function saveDraft(url) {
    var title = byId('edTitle').value.trim();
    if (!title) { byId('capSaved').className = 'status err'; byId('capSaved').textContent = 'It needs a name.'; return; }

    var steps = linesOf('edSteps');
    if (!steps.length) { byId('capSaved').className = 'status err'; byId('capSaved').textContent = 'It needs at least one step.'; return; }

    var base = Capture.slugify(title), id = base, n = 2;
    while (findRecipe(id)) { id = base + '-' + n++; }

    var recipe = {
      id: id,
      title: title,
      alt: [],
      category: byId('edCat').value,
      source: 'added',
      cooker: null,
      ingredients: linesOf('edIng').map(Capture.splitIngredient).filter(Boolean),
      steps: steps,
      notes: linesOf('edNotes'),
      variants: [],
      link: url || null
    };

    var custom = load(KEY.custom, []);
    custom.push(recipe);
    if (!save(KEY.custom, custom)) {
      byId('capSaved').className = 'status err';
      byId('capSaved').textContent = 'Could not save to this device. Copy the JSON below instead.';
    } else {
      byId('capSaved').className = 'status ok';
      byId('capSaved').textContent = 'Saved. It is in the book on this device now.';
      toast('Saved to the book');
    }

    byId('capExport').innerHTML =
      '<div class="note-block" style="margin-top:1.4rem"><strong>Keep it for good.</strong> ' +
      'This lives on this device only. To put it in the book on every device, paste the block below into ' +
      '<code>recipes/data/recipes.json</code>, inside the <code>recipes</code> array.</div>' +
      '<div class="field"><textarea class="code" readonly style="min-height:200px">' +
      esc(Capture.exportJSON(recipe)) + '</textarea></div>' +
      '<a class="btn btn--ghost btn--full" href="#/r/' + esc(id) + '">Open it</a>';
  }

  /* ---------- router ---------- */

  function route() {
    var hash = (location.hash || '#/').replace(/^#/, '');
    var qi = hash.indexOf('?');
    var path = (qi === -1 ? hash : hash.slice(0, qi)).replace(/^\/+|\/+$/g, '');
    var parts = path ? path.split('/') : [];

    var cookOpen = !byId('cook').hidden;
    var wantCook = parts[0] === 'r' && parts[2] === 'cook';

    if (!wantCook && cookOpen) closeCook();

    if (parts[0] === 'r' && parts[1]) {
      if (wantCook) {
        if (!cookOpen) { viewRecipe(parts[1]); openCook(parts[1]); }
        return;
      }
      viewRecipe(parts[1]);
      return;
    }
    if (parts[0] === 'fav') { viewFavourites(); return; }
    if (parts[0] === 'add') { viewAdd(); return; }
    if (parts[0] === 'ref') { viewReference(); return; }
    viewBrowse();
  }

  /* ---------- chrome wiring ---------- */

  function buildChips() {
    var chips = byId('chips');
    var html = '<button class="chip" data-cat="all" aria-pressed="true">Everything</button>';
    DATA.categories.forEach(function (c) {
      html += '<button class="chip" data-cat="' + esc(c.id) + '" aria-pressed="false">' + esc(c.name) + '</button>';
    });
    chips.innerHTML = html;

    chips.addEventListener('click', function (e) {
      var btn = e.target.closest('.chip');
      if (!btn) return;
      state.cat = btn.dataset.cat;
      Array.prototype.forEach.call(chips.children, function (c) {
        c.setAttribute('aria-pressed', String(c === btn));
      });
      if (location.hash !== '#/' && location.hash !== '') location.hash = '#/';
      else viewBrowse();
    });
  }

  function wireSearch() {
    var input = byId('search');
    var clear = byId('searchClear');
    var t;
    input.addEventListener('input', function () {
      clearTimeout(t);
      clear.classList.toggle('show', !!input.value);
      t = setTimeout(function () {
        state.q = input.value;
        if (location.hash && location.hash !== '#/') location.hash = '#/';
        else viewBrowse();
      }, 130);
    });
    clear.addEventListener('click', function () {
      input.value = ''; state.q = '';
      clear.classList.remove('show');
      input.focus();
      viewBrowse();
    });
  }

  // Favourite buttons, wherever they are
  document.addEventListener('click', function (e) {
    var btn = e.target.closest('[data-fav]');
    if (!btn) return;
    e.preventDefault();
    var id = btn.dataset.fav;
    var now = toggleFav(id);
    toast(now ? 'Added to favourites' : 'Removed from favourites');

    var onDetail = btn.classList.contains('btn');
    btn.setAttribute('aria-pressed', String(now));
    btn.classList.toggle('is-fav', now);
    btn.innerHTML = (now ? ICON.starFill : ICON.star) + (onDetail ? (now ? 'Favourited' : 'Favourite') : '');
    if (location.hash.indexOf('#/fav') === 0) viewFavourites();
  });

  byId('cookClose').addEventListener('click', function () {
    if (history.length > 1) history.back(); else location.hash = '#/';
  });
  byId('navFav').addEventListener('click', function () { location.hash = '#/fav'; });
  byId('navAdd').addEventListener('click', function () { location.hash = '#/add'; });
  byId('navRef').addEventListener('click', function () { location.hash = '#/ref'; });

  document.addEventListener('keydown', function (e) {
    if (e.key === 'Escape' && !byId('cook').hidden) {
      if (history.length > 1) history.back(); else location.hash = '#/';
    }
  });

  window.addEventListener('hashchange', route);

  /* ---------- boot ---------- */

  Promise.all([
    fetch('data/recipes.json').then(function (r) {
      if (!r.ok) throw new Error('HTTP ' + r.status);
      return r.json();
    }),
    // Credits are optional: a missing file just means every recipe draws its art.
    fetch('data/photo-credits.json').then(function (r) { return r.ok ? r.json() : {}; })
      .catch(function () { return {}; })
  ])
    .then(function (both) {
      var d = both[0];
      PHOTOS = both[1] || {};
      DATA = d;
      DATA.categories.forEach(function (c) { CATMAP[c.id] = c; });
      buildChips();
      wireSearch();
      route();
      if ('serviceWorker' in navigator) {
        navigator.serviceWorker.register('sw.js').catch(function () {});
      }
    })
    .catch(function (err) {
      byId('main').innerHTML = '<div class="view"><div class="empty">' +
        '<h2>Could not load the recipes</h2><p>' + esc(err.message) + '</p></div></div>';
    });
})();
