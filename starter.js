/* Moodreel starter quiz: 25 widely known "popular picks", written into the app.
 * The app never looks these up online. Edit this list freely: each entry needs a
 * title, a type, a length that fits the type, and tags that fit the type (see rules.js).
 */
(function (root) {
  'use strict';

  var STARTER = [
    // Movies
    { title: 'Avatar', type: 'movie', time: 'two', moods: ['intense', 'scifi', 'action', 'adventure'] },
    { title: 'Avengers: Endgame', type: 'movie', time: 'two', moods: ['intense', 'action', 'scifi', 'adventure'] },
    { title: 'Titanic', type: 'movie', time: 'two', moods: ['romantic', 'sad', 'drama', 'historical'] },
    { title: 'The Lion King', type: 'movie', time: 'two', moods: ['kids', 'sad', 'animated', 'adventure'] },
    { title: 'Inception', type: 'movie', time: 'two', moods: ['mind', 'intense', 'scifi', 'thriller'] },
    { title: 'Get Out', type: 'movie', time: 'two', moods: ['spooky', 'mind', 'horror', 'thriller'] },
    { title: 'Barbie', type: 'movie', time: 'two', moods: ['funny', 'light', 'upbeat'] },
    // Shows
    { title: 'Stranger Things', type: 'show', time: 'hour', moods: ['spooky', 'intense', 'scifi', 'horror', 'adventure'] },
    { title: 'Friends', type: 'show', time: 'short', moods: ['funny', 'cozy', 'light'] },
    { title: 'The Office', type: 'show', time: 'short', moods: ['funny', 'cozy', 'light'] },
    { title: 'Squid Game', type: 'show', time: 'hour', moods: ['intense', 'foreign', 'thriller', 'drama'] },
    { title: 'Breaking Bad', type: 'show', time: 'hour', moods: ['intense', 'drama', 'thriller'] },
    { title: 'Suits', type: 'show', time: 'hour', moods: ['light', 'legal', 'drama'] },
    // Books
    { title: 'Harry Potter (series)', type: 'book', time: 'saga', moods: ['kids', 'fantasy', 'adventure'] },
    { title: 'The Hunger Games (trilogy)', type: 'book', time: 'trilogy', moods: ['intense', 'scifi', 'action', 'adventure'] },
    { title: 'The Lord of the Rings', type: 'book', time: 'trilogy', moods: ['fantasy', 'adventure'] },
    { title: 'To Kill a Mockingbird', type: 'book', time: 'single', moods: ['sad', 'legal', 'drama', 'historical'] },
    { title: 'Where the Crawdads Sing', type: 'book', time: 'single', moods: ['sad', 'romantic', 'mystery'] },
    { title: 'Dune', type: 'book', time: 'single', moods: ['mind', 'scifi', 'adventure'] },
    // Music
    { title: 'Thriller (Michael Jackson)', type: 'music', time: 'hour', moods: ['upbeat', 'pop'] },
    { title: '1989 (Taylor Swift)', type: 'music', time: 'hour', moods: ['upbeat', 'romantic', 'pop'] },
    { title: 'Un Verano Sin Ti (Bad Bunny)', type: 'music', time: 'hour', moods: ['upbeat', 'chill', 'foreign', 'latin'] },
    // Podcasts
    { title: 'The Daily', type: 'podcast', time: 'short', moods: ['news'] },
    { title: 'Crime Junkie', type: 'podcast', time: 'hour', moods: ['spooky', 'truecrime', 'storytelling'] },
    { title: 'The Joe Rogan Experience', type: 'podcast', time: 'two', moods: ['interview', 'popculture'] }
  ];

  function key(title) { return String(title || '').trim().toLowerCase(); }

  /* Order the quiz cards.
   * - Only the types you picked (none picked = all types).
   * - Titles already in your list are left out.
   * - Most favorites matched first; ties keep the list order above.
   * Returns [{ item, matches }]. */
  function quizOrder(catalog, types, favorites, existingTitles) {
    types = types || []; favorites = favorites || [];
    var have = (existingTitles || []).map(key);
    return catalog
      .map(function (item, i) {
        var matches = item.moods.filter(function (m) { return favorites.indexOf(m) !== -1; }).length;
        return { item: item, matches: matches, i: i };
      })
      .filter(function (c) {
        return (!types.length || types.indexOf(c.item.type) !== -1) && have.indexOf(key(c.item.title)) === -1;
      })
      .sort(function (a, b) { return b.matches - a.matches || a.i - b.i; })
      .map(function (c) { return { item: c.item, matches: c.matches }; });
  }

  root.MoodStarter = { STARTER: STARTER, quizOrder: quizOrder };
})(typeof globalThis !== 'undefined' ? globalThis : this);
