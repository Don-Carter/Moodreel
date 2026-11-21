# Moodreel

A phone app for movies, shows, books, music and podcasts. Log what you want to watch, read or hear, tag it with moods and genres, note who recommended it, and tap **Pick for me** to get a suggestion. Every suggestion shows its math, so you can check it by hand.

- **No AI and no accounts.** The app makes no network calls after it loads. Your list is saved only on your phone.
- **Works offline** once it has been opened one time.
- **Installable.** Add it to your home screen and it opens in its own window with its own icon.

## The rules

These rules are written in `rules.js`, and every number is in the `RULES` block at the top. The Rules tab in the app shows the same text, generated from those numbers, so the text and the math always agree.

1. Only items in Up next are considered.
2. If you pick a type, anything of another type is left out.
3. If you pick a time, anything longer than that time is left out. Shorter items still count.
4. +2 points for each mood or genre you picked that the item has.
5. +1 point if the person who recommended it has an average rating of 4.0★ or more, across at least 2 finished picks you rated.
6. +1 point if it has been waiting more than 30 days.
7. Highest total wins. Ties go to whichever was added first.
8. The top 3 are shown, each with its math.

## Types, moods and genres

| | |
|---|---|
| **Types** | Movie, Show, Book, Music, Podcast |
| **Moods (every type)** | Cozy, Funny, Intense, Mind-bending, Sad is OK, Light, Spooky, Romantic, Upbeat, Chill |
| **Movie / Show / Book genres** | Sci-Fi, Action, Horror, Fantasy, Mystery, Thriller, Drama, Adventure, Historical, Documentary / Nonfiction, Animated |
| **Music genres** | Pop, Rock, Hip-hop, R&B, Jazz, Classical, Electronic, Country, Indie, Metal, Latin, Soundtrack |
| **Podcast genres** | True crime, News, History, Science, Interview, Sports, Business, Storytelling, Self-improvement, Pop culture |

Each type only shows its own genres. If you change an item's type, genres that don't fit are removed and moods stay. There's no Comedy genre, because the Funny mood covers it, so the same idea can't be counted twice.

## Features

| Feature | Where |
|---|---|
| Saves your data between uses | Phone storage, plus Save a backup file / Restore on the Rules tab |
| Works without internet | `sw.js` keeps a copy of every app file on the phone |
| Calculates results from your inputs | Pick for me (`rules.js`) |
| Charts your history | People tab: average rating per recommender, and items finished per month |
| Vibration | A short buzz when a pick appears (Android only; iPhones don't allow it for web apps) |

## Put it online (GitHub Pages, free)

1. On github.com, create a new **public** repository named `moodreel`.
2. Click **uploading an existing file** and drag in everything in this folder.
3. Go to **Settings → Pages**. Under "Build and deployment", set Source to **Deploy from a branch**, set the branch to **main** and the folder to **/ (root)**, then click **Save**.
4. After a minute or two the app is live at `https://YOUR-USERNAME.github.io/moodreel/`.

## Install on a phone

- **iPhone (Safari):** open the link, tap **Share**, then tap **Add to Home Screen**.
- **Android (Chrome):** open the link, tap the **⋮** menu, then tap **Install app** (or **Add to Home screen**).

To check offline mode, open the app once, turn on airplane mode, then open it from the home screen icon.

## Updating the app

After changing any file, change `VERSION` in `sw.js` (for example `moodreel-v2`) and upload the changed files. Phones pick up the new version the next time the app is opened twice.

## Tests

- **In a browser:** open `tests/index.html`.
- **On a Mac, from this folder:**
  `/System/Library/Frameworks/JavaScriptCore.framework/Versions/Current/Helpers/jsc rules.js tests/rules.test.js`

## Files

`index.html` (screens), `styles.css` (look), `app.js` (screens, saving, charts), `rules.js` (scoring rules), `sw.js` (offline), `manifest.webmanifest` (install info), `icons/` (app icons, made by `tools/make_icons.py`), `tests/`.
