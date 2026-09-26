# Family Recipe Book

A private, offline recipe app. Plain HTML, CSS and JavaScript, no build step.
Lives at `sanjanagangarapu.com/recipes/` and is unlisted: `noindex`, blocked in
`robots.txt`, absent from the sitemap and the site nav.

## Put it on the iPhone

1. Open `sanjanagangarapu.com/recipes/` in Safari.
2. Share button, then **Add to Home Screen**.

It then opens fullscreen with its own icon and works with no signal. Installing
also stops Safari clearing your favourites and captured recipes, which it does
to sites you have not opened in about a week.

## Adding a recipe permanently

Recipes captured in the app live on that one device. To put one in the book for
good, on every device:

1. Save it in the app, then copy the JSON block it shows you.
2. Paste it into `data/recipes.json`, inside the `recipes` array.
3. Bump `CACHE` in `sw.js` (`frb-v3` to `frb-v4`) so phones fetch the new copy.
4. Commit and push.

Step 3 matters. Without it, phones keep serving the version they already cached.

## The Share sheet shortcut

iOS Safari has no Web Share Target, so a shortcut does the job instead. In the
Shortcuts app, make a new shortcut, turn on **Show in Share Sheet**, accept URLs
and text, then add these actions:

1. **Get URLs from Input**
2. **Get Text from Input**
3. **URL Encode** the text
4. **Open URLs** with:
   `https://sanjanagangarapu.com/recipes/#/add?url=[URL]&text=[Encoded Text]`

Sharing a reel or video into it opens the add screen with the link and caption
already filled in, parsed and ready to correct.

## Why the caption has to be pasted

A page on a plain website is not allowed to read instagram.com or youtube.com:
the browser blocks it with CORS, and both platforms block scraping anyway.
YouTube's oEmbed endpoint is the one exception and it allows cross-origin calls,
so YouTube links fill in their own title and thumbnail. Descriptions and
transcripts are not available through it. Automating that step would need a
small server, which this deliberately does not have.

## Recipes marked "Check this"

Five entries were bare headings in the original notes with no method under them,
so they were filled in from standard recipes rather than family ones:
Miriyal Chaaru, Bisi Bele Bath Powder, Dhokla, Chirmuri and Overnight Oats.
Each says so on its own page. Two recipes, Ghee Rice and Corn Pulav, had
conflicting whistle counts between the two sets of notes, and both show the
lower count with the alternative noted underneath.

## Files

```
index.html              app shell, hash routed
css/app.css             tokens, light and dark, responsive
js/app.js               router, search, cook mode, favourites, capture UI
js/capture.js           oEmbed lookup, text parser, export
data/recipes.json       every recipe
sw.js                   offline cache
manifest.webmanifest    Home Screen install
```
