/* ============================================================
   capture.js — turn a pasted link + caption into a recipe
   ------------------------------------------------------------
   A static site cannot read instagram.com or youtube.com from
   the browser: CORS blocks it and both platforms block scraping
   regardless. What DOES work cross-origin is YouTube's public
   oEmbed endpoint, which gives us a title and a thumbnail.
   The recipe body still has to be pasted in. This module makes
   that paste as painless as it can be.
   ============================================================ */
(function (global) {
  'use strict';

  /* ---------- link identification ---------- */

  var YT = /(?:youtube\.com\/(?:watch\?(?:.*&)?v=|shorts\/|embed\/|live\/)|youtu\.be\/)([A-Za-z0-9_-]{6,})/;
  var IG = /instagram\.com\/(?:p|reel|reels|tv)\/([A-Za-z0-9_-]+)/;

  function identify(url) {
    if (!url) return { kind: 'none' };
    var m = YT.exec(url);
    if (m) return { kind: 'youtube', id: m[1] };
    m = IG.exec(url);
    if (m) return { kind: 'instagram', id: m[1] };
    if (/^https?:\/\//i.test(url)) return { kind: 'web' };
    return { kind: 'none' };
  }

  /* ---------- metadata: best effort, never blocking ---------- */

  function fetchMeta(url) {
    var info = identify(url);

    if (info.kind === 'youtube') {
      // Thumbnail is a plain image URL, so it works with no network permission at all.
      var thumb = 'https://i.ytimg.com/vi/' + info.id + '/hqdefault.jpg';
      var endpoint = 'https://www.youtube.com/oembed?format=json&url=' +
        encodeURIComponent('https://www.youtube.com/watch?v=' + info.id);

      return fetch(endpoint)
        .then(function (r) { return r.ok ? r.json() : null; })
        .then(function (d) {
          return {
            kind: 'youtube',
            title: (d && d.title) || '',
            author: (d && d.author_name) || '',
            thumbnail: thumb
          };
        })
        .catch(function () {
          // oEmbed unreachable (offline, or blocked). Thumbnail still resolves.
          return { kind: 'youtube', title: '', author: '', thumbnail: thumb };
        });
    }

    if (info.kind === 'instagram') {
      // Instagram's oEmbed needs an app token, so there is nothing to fetch.
      return Promise.resolve({ kind: 'instagram', title: '', author: '', thumbnail: '' });
    }

    return Promise.resolve({ kind: info.kind, title: '', author: '', thumbnail: '' });
  }

  /* ---------- text parsing ---------- */

  var UNITS = '(?:cups?|tbsp|tablespoons?|tsp|teaspoons?|g|grams?|kgs?|ml|l|litres?|liters?|oz|ounces?|lbs?|pounds?|glass(?:es)?|handfuls?|pinch(?:es)?|cloves?|pods?|inch(?:es)?|whistles?|bunch(?:es)?|sprigs?|slices?|pieces?|cans?|packets?|sticks?|drops?)';
  var FRAC = '[¼½¾⅓⅔⅛⅜⅝⅞]';

  var RE_HEAD_ING = /^\s*(?:#+\s*)?(?:\*\*)?\s*(ingredients?|you(?:'ll)? will need|you need|what you need|shopping list|for the .+)\s*(?:\*\*)?\s*:?\s*$/i;
  var RE_HEAD_STEP = /^\s*(?:#+\s*)?(?:\*\*)?\s*(methods?|steps?|directions?|instructions?|preparation|how to make(?: it)?|recipe)\s*(?:\*\*)?\s*:?\s*$/i;
  var RE_HEAD_NOTE = /^\s*(?:#+\s*)?(?:\*\*)?\s*(notes?|tips?|serving|to serve|variations?)\s*(?:\*\*)?\s*:?\s*$/i;

  var RE_QTY_LEAD = new RegExp('^\\s*(?:' + FRAC + '|\\d+(?:[.,/]\\d+)?(?:\\s*-\\s*\\d+(?:[.,/]\\d+)?)?(?:\\s*' + FRAC + ')?)\\s*' + UNITS + '?\\b', 'i');
  var RE_HAS_UNIT = new RegExp('(?:\\d|' + FRAC + ')\\s*' + UNITS + '\\b', 'i');
  var RE_BULLET = /^\s*[-•*·–—▢]\s+/;
  var RE_NUMBERED = /^\s*(\d{1,2})[.)]\s+/;

  var VERBS = ['add','heat','fry','mix','stir','cook','boil','simmer','grind','blend','soak','wash','chop','cut','peel','pour','serve','garnish','season','whisk','knead','rest','steam','roast','saute','sauté','sautee','transfer','remove','drain','combine','place','put','bring','let','leave','shape','coat','deep','shallow','toss','sprinkle','squeeze','melt','preheat','grease','cover','close','open','crush','mash','temper','top','divide','scoop','flatten','repeat','set','keep','continue','once','when','after','before','meanwhile','finally','finish'];
  var RE_VERB = new RegExp('^(?:' + VERBS.join('|') + ')\\b', 'i');

  function clean(line) {
    return line
      .replace(RE_BULLET, '')
      .replace(/^\s*\*\*(.+?)\*\*\s*$/, '$1')
      .replace(/\s+/g, ' ')
      .trim();
  }

  function stripNum(line) { return line.replace(RE_NUMBERED, '').trim(); }

  // "Rice flour - 1 cup" / "Rice flour: 1 cup"  ->  { item, qty }
  // "1 cup rice flour"                          ->  { item, qty }
  function splitIngredient(raw) {
    var line = clean(raw);
    if (!line) return null;

    var sep = line.match(/^(.{2,60}?)\s*[-–—:]\s+(.{1,60})$/);
    if (sep) {
      var left = sep[1].trim(), right = sep[2].trim();
      // Whichever side carries the number is the quantity.
      if (RE_QTY_LEAD.test(right) || /\d|[¼½¾⅓⅔]/.test(right)) return { item: left, qty: right };
      if (RE_QTY_LEAD.test(left)) return { item: right, qty: left };
      return { item: left, qty: right };
    }

    var lead = line.match(RE_QTY_LEAD);
    if (lead && lead[0].trim()) {
      var qty = lead[0].trim();
      var rest = line.slice(lead[0].length).trim().replace(/^of\s+/i, '');
      if (rest) return { item: rest, qty: qty };
    }

    // Trailing parenthetical quantity: "Onion (2, sliced)"
    var paren = line.match(/^(.+?)\s*\(([^)]{1,40})\)\s*$/);
    if (paren && /\d|[¼½¾⅓⅔]/.test(paren[2])) return { item: paren[1].trim(), qty: paren[2].trim() };

    return { item: line, qty: '' };
  }

  function looksLikeIngredient(line) {
    if (!line) return false;
    if (line.length > 90) return false;
    if (RE_HAS_UNIT.test(line)) return true;
    if (RE_QTY_LEAD.test(line) && !RE_VERB.test(line)) return true;
    if (/[-–—:]\s*(?:\d|[¼½¾⅓⅔])/.test(line)) return true;
    if (line.length < 42 && !RE_VERB.test(line) && !/[.!?]$/.test(line)) return true;
    return false;
  }

  function looksLikeStep(line) {
    if (!line) return false;
    if (RE_VERB.test(line)) return true;
    if (line.length > 70) return true;
    return false;
  }

  /**
   * Parse a pasted caption / description into recipe parts.
   * Explicit "Ingredients" / "Method" headings win. With no headings,
   * each line is classified on its own.
   */
  function parseText(text) {
    var out = { ingredients: [], steps: [], notes: [] };
    if (!text || !text.trim()) return out;

    var lines = text.replace(/\r/g, '').split('\n');
    var mode = null;          // 'ing' | 'step' | 'note' once a heading is seen
    var sawHeading = false;
    var pending = [];         // lines seen before any heading

    lines.forEach(function (raw) {
      var line = raw.trim();
      if (!line) return;
      if (/^[-=_~─━]{3,}$/.test(line)) return;      // divider rules

      if (RE_HEAD_ING.test(line))  { mode = 'ing';  sawHeading = true; return; }
      if (RE_HEAD_STEP.test(line)) { mode = 'step'; sawHeading = true; return; }
      if (RE_HEAD_NOTE.test(line)) { mode = 'note'; sawHeading = true; return; }

      var body = clean(line);
      if (!body) return;

      if (mode === 'ing')  { var ing = splitIngredient(body); if (ing) out.ingredients.push(ing); return; }
      if (mode === 'step') { out.steps.push(stripNum(body)); return; }
      if (mode === 'note') { out.notes.push(stripNum(body)); return; }
      pending.push(body);
    });

    // Anything before the first heading, or everything if there were none.
    pending.forEach(function (body) {
      var bare = stripNum(body);
      if (looksLikeIngredient(body) && !looksLikeStep(bare)) {
        var ing = splitIngredient(body);
        if (ing) out.ingredients.push(ing);
      } else if (bare) {
        out.steps.push(bare);
      }
    });

    // A parse that found only steps and no ingredients is usually a numbered
    // ingredient list. Move the short, unit-bearing ones across.
    if (!sawHeading && out.ingredients.length === 0 && out.steps.length > 2) {
      var moved = [];
      out.steps = out.steps.filter(function (s) {
        if (looksLikeIngredient(s) && !RE_VERB.test(s)) { moved.push(s); return false; }
        return true;
      });
      moved.forEach(function (s) { var i = splitIngredient(s); if (i) out.ingredients.push(i); });
    }

    return out;
  }

  /* ---------- export ---------- */

  function slugify(s) {
    return (s || 'recipe').toLowerCase()
      .replace(/[^a-z0-9]+/g, '-')
      .replace(/^-+|-+$/g, '')
      .slice(0, 60) || 'recipe';
  }

  function exportJSON(recipe) {
    var clean = {
      id: recipe.id,
      title: recipe.title,
      alt: recipe.alt || [],
      category: recipe.category,
      source: 'added',
      cooker: recipe.cooker || null,
      ingredients: recipe.ingredients || [],
      steps: recipe.steps || [],
      notes: recipe.notes || [],
      variants: [],
      link: recipe.link || null
    };
    return JSON.stringify(clean, null, 1);
  }

  global.Capture = {
    identify: identify,
    fetchMeta: fetchMeta,
    parseText: parseText,
    splitIngredient: splitIngredient,
    slugify: slugify,
    exportJSON: exportJSON
  };
})(window);
