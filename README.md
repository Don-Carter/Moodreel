# Moodreel

A phone app for movies, shows, books, music and podcasts. Log what you want to watch, read or hear, tag it with moods and genres, note who recommended it, and tap **Pick for me** to get a suggestion. Every suggestion shows its math, so you can check it by hand.

- **No AI and no accounts.** The app makes no network calls after it loads. Your list is saved only on your phone.
- **Works offline** once it has been opened one time.
- **Installable.** Add it to your home screen and it opens in its own window with its own icon.

## The rules

These rules are written in `rules.js`, and every number is in the `RULES` block at the top. The Rules tab in the app shows the same text, generated from those numbers, so the text and the math always agree.

1. Items in Up next or In progress are considered. Finished items are not.
2. If you pick a type, anything of another type is left out.
3. If you pick a time, anything longer is left out. Shorter items still count. Books are measured in books, not hours: they're only filtered by length (Single book, Trilogy, Saga) when you pick Book, so otherwise they always pass the time filter.
4. +2 points for each mood or genre you picked that the item has.
5. +1 point if the person who recommended it has an average rating of 4.0★ or more, across at least 2 finished picks you rated.
6. +1 point if it has been waiting more than 30 days.
7. Highest total wins. Ties go to whichever was added first.
8. The top 3 are shown, each with its math.

## Types, moods and genres

| | |
|---|---|
| **Types** | Movie, Show, Book, Music, Podcast |
| **Lengths** | Under 30 min, About 1 hour, About 2 hours, A whole weekend. Books instead use Single book, Trilogy, Saga (4+ books) |
| **Statuses** | Up next, In progress, Finished |
| **Moods (every type)** | Cozy, Funny, Intense, Mind-bending, Sad is OK, Light, Spooky, Romantic, Upbeat, Chill, Kids & family, Foreign language |
| **Movie / Show / Book genres** | Sci-Fi, Action, Horror, Fantasy, Mystery, Thriller, Drama, Adventure, Historical, Documentary / Nonfiction, Animated, Legal, News |
| **Music genres** | Pop, Rock, Hip-hop, R&B, Jazz, Classical, Electronic, Country, Indie, Metal, Latin, Soundtrack |
| **Podcast genres** | Legal, News, True crime, History, Science, Interview, Sports, Business, Storytelling, Self-improvement, Pop culture |

Each type only shows its own genres. If you change an item's type, genres that don't fit are removed and moods stay, and the length switches between hours and books. Legal and News are each one tag even though they show for several types, so they can't be counted twice. There's no Comedy genre, because the Funny mood covers it.

## Starter quiz, people and "tell them"

- **Starter quiz.** It opens the first time the app runs with an empty list, and you can take it again from **Rules → Take the starter quiz**.
  - Pick your types, then up to 10 favorite moods and genres. Your favorites start pre-selected on Pick for me.
  - Mark popular titles as **Seen it**, **Watching now** or **Want to**.
  - Add the people who recommend things to you.
  - The 25 titles are written into `starter.js`, and the app never looks anything up online. Cards are sorted by how many of your favorites they match, with ties kept in the list's order.
- **People.** On the People tab you can add or remove names. Saved names are suggested in "Recommended by". Removing a name doesn't change items that person already recommended.
- **Tell them what you thought.** When you mark something **Finished** and it has a recommender, the app offers to message them.
  - **Send a message** opens your phone's own share menu with a ready-made note. If that isn't available, it copies the note for you.
  - The app itself never sends anything.
  - Finished items you haven't shared yet show a **💬 Tell …** link, so you can do it later.

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

After changing any file, change `VERSION` in `sw.js` (for example `moodreel-v4`) and upload the changed files. Phones pick up the new version the next time the app is opened twice.

## Tests

- **In a browser:** open `tests/index.html`.
- **On a Mac, from this folder:**
  `/System/Library/Frameworks/JavaScriptCore.framework/Versions/Current/Helpers/jsc rules.js starter.js tests/rules.test.js`

## Files

`index.html` (screens), `styles.css` (look), `app.js` (screens, saving, charts, quiz), `rules.js` (scoring rules), `starter.js` (the 25 starter-quiz titles), `sw.js` (offline), `manifest.webmanifest` (install info), `icons/` (app icons, made by `tools/make_icons.py`), `tests/`.
