/* Moodreel starter quiz: 96 widely known "popular picks", written into the app.
 * Every mood and genre has at least one title, so any favorite you choose has a match.
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
    { title: 'Toy Story', type: 'movie', time: 'two', moods: ['kids', 'funny', 'cozy', 'animated', 'adventure'] },
    { title: 'The Dark Knight', type: 'movie', time: 'two', moods: ['intense', 'action', 'thriller', 'drama'] },
    { title: 'Parasite', type: 'movie', time: 'two', moods: ['intense', 'mind', 'foreign', 'thriller', 'drama'] },
    { title: 'Coco', type: 'movie', time: 'two', moods: ['kids', 'sad', 'upbeat', 'animated', 'fantasy'] },
    { title: 'Jurassic Park', type: 'movie', time: 'two', moods: ['intense', 'scifi', 'adventure', 'action'] },
    { title: 'The Notebook', type: 'movie', time: 'two', moods: ['romantic', 'sad', 'drama'] },
    { title: 'Top Gun: Maverick', type: 'movie', time: 'two', moods: ['intense', 'upbeat', 'action'] },
    { title: 'A Few Good Men', type: 'movie', time: 'two', moods: ['intense', 'legal', 'drama'] },
    { title: 'Oppenheimer', type: 'movie', time: 'weekend', moods: ['intense', 'mind', 'historical', 'drama'] },
    { title: 'Spider-Man: Into the Spider-Verse', type: 'movie', time: 'two', moods: ['upbeat', 'kids', 'funny', 'animated', 'action'] },
    { title: 'The Shining', type: 'movie', time: 'two', moods: ['spooky', 'intense', 'horror'] },
    { title: 'Knives Out', type: 'movie', time: 'two', moods: ['funny', 'cozy', 'mystery'] },
    { title: 'Free Solo', type: 'movie', time: 'two', moods: ['intense', 'documentary', 'adventure'] },
    { title: 'Spotlight', type: 'movie', time: 'two', moods: ['intense', 'news', 'drama', 'historical'] },
    { title: 'Amélie', type: 'movie', time: 'two', moods: ['cozy', 'romantic', 'funny', 'foreign'] },
    // Shows
    { title: 'Stranger Things', type: 'show', time: 'hour', moods: ['spooky', 'intense', 'scifi', 'horror', 'adventure'] },
    { title: 'Friends', type: 'show', time: 'short', moods: ['funny', 'cozy', 'light'] },
    { title: 'The Office', type: 'show', time: 'short', moods: ['funny', 'cozy', 'light'] },
    { title: 'Squid Game', type: 'show', time: 'hour', moods: ['intense', 'foreign', 'thriller', 'drama'] },
    { title: 'Breaking Bad', type: 'show', time: 'hour', moods: ['intense', 'drama', 'thriller'] },
    { title: 'Suits', type: 'show', time: 'hour', moods: ['light', 'legal', 'drama'] },
    { title: 'Game of Thrones', type: 'show', time: 'hour', moods: ['intense', 'fantasy', 'drama', 'adventure'] },
    { title: 'The Last of Us', type: 'show', time: 'hour', moods: ['sad', 'intense', 'scifi', 'horror', 'drama'] },
    { title: 'Bridgerton', type: 'show', time: 'hour', moods: ['romantic', 'light', 'historical', 'drama'] },
    { title: 'Wednesday', type: 'show', time: 'hour', moods: ['spooky', 'funny', 'mystery'] },
    { title: 'Avatar: The Last Airbender', type: 'show', time: 'short', moods: ['kids', 'funny', 'animated', 'fantasy', 'adventure'] },
    { title: 'The Crown', type: 'show', time: 'hour', moods: ['historical', 'drama'] },
    { title: 'Only Murders in the Building', type: 'show', time: 'short', moods: ['funny', 'cozy', 'mystery'] },
    { title: 'Money Heist', type: 'show', time: 'hour', moods: ['intense', 'foreign', 'thriller', 'action'] },
    { title: 'Planet Earth', type: 'show', time: 'hour', moods: ['chill', 'cozy', 'kids', 'documentary'] },
    { title: 'The Newsroom', type: 'show', time: 'hour', moods: ['intense', 'news', 'drama'] },
    { title: 'Abbott Elementary', type: 'show', time: 'short', moods: ['funny', 'cozy', 'light'] },
    { title: 'Better Call Saul', type: 'show', time: 'hour', moods: ['intense', 'legal', 'drama'] },
    { title: 'Severance', type: 'show', time: 'hour', moods: ['mind', 'intense', 'scifi', 'thriller', 'mystery'] },
    { title: 'Dark', type: 'show', time: 'hour', moods: ['mind', 'spooky', 'foreign', 'scifi', 'mystery'] },
    // Books
    { title: 'Harry Potter (series)', type: 'book', time: 'saga', moods: ['kids', 'fantasy', 'adventure'] },
    { title: 'The Hunger Games (trilogy)', type: 'book', time: 'trilogy', moods: ['intense', 'scifi', 'action', 'adventure'] },
    { title: 'The Lord of the Rings', type: 'book', time: 'trilogy', moods: ['fantasy', 'adventure'] },
    { title: 'To Kill a Mockingbird', type: 'book', time: 'single', moods: ['sad', 'legal', 'drama', 'historical'] },
    { title: 'Where the Crawdads Sing', type: 'book', time: 'single', moods: ['sad', 'romantic', 'mystery'] },
    { title: 'Dune', type: 'book', time: 'single', moods: ['mind', 'scifi', 'adventure'] },
    { title: 'Percy Jackson (series)', type: 'book', time: 'saga', moods: ['kids', 'funny', 'fantasy', 'adventure'] },
    { title: 'The Hobbit', type: 'book', time: 'single', moods: ['cozy', 'kids', 'fantasy', 'adventure'] },
    { title: 'Gone Girl', type: 'book', time: 'single', moods: ['intense', 'mind', 'thriller', 'mystery'] },
    { title: 'Pride and Prejudice', type: 'book', time: 'single', moods: ['romantic', 'funny', 'historical'] },
    { title: '1984', type: 'book', time: 'single', moods: ['mind', 'sad', 'scifi'] },
    { title: 'The Fault in Our Stars', type: 'book', time: 'single', moods: ['sad', 'romantic', 'drama'] },
    { title: 'Project Hail Mary', type: 'book', time: 'single', moods: ['funny', 'mind', 'scifi', 'adventure'] },
    { title: 'It (Stephen King)', type: 'book', time: 'single', moods: ['spooky', 'intense', 'horror'] },
    { title: 'The Girl with the Dragon Tattoo (Millennium trilogy)', type: 'book', time: 'trilogy', moods: ['intense', 'foreign', 'thriller', 'mystery'] },
    { title: 'Sapiens', type: 'book', time: 'single', moods: ['mind', 'documentary', 'historical'] },
    { title: 'A Court of Thorns and Roses (series)', type: 'book', time: 'saga', moods: ['romantic', 'fantasy', 'adventure'] },
    { title: 'The Seven Husbands of Evelyn Hugo', type: 'book', time: 'single', moods: ['romantic', 'sad', 'drama', 'historical'] },
    { title: 'The Firm', type: 'book', time: 'single', moods: ['intense', 'legal', 'thriller'] },
    { title: 'Little Women', type: 'book', time: 'single', moods: ['cozy', 'sad', 'drama', 'historical'] },
    { title: 'Atomic Habits', type: 'book', time: 'single', moods: ['upbeat', 'light', 'documentary'] },
    { title: "All the President's Men", type: 'book', time: 'single', moods: ['intense', 'news', 'documentary', 'historical'] },
    // Music
    { title: 'Thriller (Michael Jackson)', type: 'music', time: 'hour', moods: ['upbeat', 'spooky', 'pop'] },
    { title: '1989 (Taylor Swift)', type: 'music', time: 'hour', moods: ['upbeat', 'romantic', 'pop'] },
    { title: 'Un Verano Sin Ti (Bad Bunny)', type: 'music', time: 'hour', moods: ['upbeat', 'chill', 'foreign', 'latin'] },
    { title: 'Abbey Road (The Beatles)', type: 'music', time: 'hour', moods: ['upbeat', 'cozy', 'rock'] },
    { title: 'Rumours (Fleetwood Mac)', type: 'music', time: 'hour', moods: ['sad', 'romantic', 'rock'] },
    { title: 'Master of Puppets (Metallica)', type: 'music', time: 'hour', moods: ['intense', 'metal'] },
    { title: 'To Pimp a Butterfly (Kendrick Lamar)', type: 'music', time: 'two', moods: ['intense', 'mind', 'hiphop'] },
    { title: 'Lemonade (Beyoncé)', type: 'music', time: 'hour', moods: ['intense', 'rnb', 'pop'] },
    { title: 'SOS (SZA)', type: 'music', time: 'two', moods: ['sad', 'romantic', 'chill', 'rnb'] },
    { title: 'A Love Supreme (John Coltrane)', type: 'music', time: 'hour', moods: ['chill', 'mind', 'jazz'] },
    { title: 'The Four Seasons (Vivaldi)', type: 'music', time: 'hour', moods: ['chill', 'cozy', 'classical'] },
    { title: 'Random Access Memories (Daft Punk)', type: 'music', time: 'two', moods: ['upbeat', 'chill', 'electronic'] },
    { title: 'Golden Hour (Kacey Musgraves)', type: 'music', time: 'hour', moods: ['chill', 'romantic', 'cozy', 'country'] },
    { title: 'AM (Arctic Monkeys)', type: 'music', time: 'hour', moods: ['chill', 'romantic', 'indie', 'rock'] },
    { title: 'Interstellar soundtrack (Hans Zimmer)', type: 'music', time: 'hour', moods: ['mind', 'intense', 'soundtrack'] },
    { title: 'Encanto soundtrack', type: 'music', time: 'hour', moods: ['kids', 'upbeat', 'foreign', 'soundtrack', 'latin'] },
    // Podcasts
    { title: 'The Daily', type: 'podcast', time: 'short', moods: ['news'] },
    { title: 'Crime Junkie', type: 'podcast', time: 'hour', moods: ['spooky', 'truecrime', 'storytelling'] },
    { title: 'The Joe Rogan Experience', type: 'podcast', time: 'two', moods: ['interview', 'popculture'] },
    { title: 'Stuff You Should Know', type: 'podcast', time: 'hour', moods: ['light', 'cozy', 'science', 'history'] },
    { title: 'Radiolab', type: 'podcast', time: 'hour', moods: ['mind', 'science', 'storytelling'] },
    { title: "Dan Carlin's Hardcore History", type: 'podcast', time: 'weekend', moods: ['intense', 'history', 'storytelling'] },
    { title: 'SmartLess', type: 'podcast', time: 'hour', moods: ['funny', 'light', 'interview', 'popculture'] },
    { title: 'How I Built This', type: 'podcast', time: 'hour', moods: ['upbeat', 'business', 'interview', 'storytelling'] },
    { title: 'Planet Money', type: 'podcast', time: 'short', moods: ['light', 'funny', 'business', 'news'] },
    { title: 'Huberman Lab', type: 'podcast', time: 'two', moods: ['science', 'selfimprovement'] },
    { title: 'The Mel Robbins Podcast', type: 'podcast', time: 'hour', moods: ['upbeat', 'selfimprovement'] },
    { title: 'Morbid', type: 'podcast', time: 'hour', moods: ['spooky', 'funny', 'truecrime'] },
    { title: 'Up First', type: 'podcast', time: 'short', moods: ['news'] },
    { title: 'The Bill Simmons Podcast', type: 'podcast', time: 'hour', moods: ['funny', 'sports', 'popculture'] },
    { title: 'Strict Scrutiny', type: 'podcast', time: 'hour', moods: ['legal', 'news', 'interview'] },
    { title: 'Call Her Daddy', type: 'podcast', time: 'hour', moods: ['funny', 'romantic', 'popculture', 'interview'] }
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
