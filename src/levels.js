// All chapters in play order. Each level: { name, hint, solution, map, extra? }.
import ch1 from './levels/ch1.js';
import ch2 from './levels/ch2.js';
import ch3 from './levels/ch3.js';
import ch4 from './levels/ch4.js';
import ch5 from './levels/ch5.js';
import ch6 from './levels/ch6.js';
import ch7 from './levels/ch7.js';
import ch8 from './levels/ch8.js';
import ch9 from './levels/ch9.js';

export const CHAPTERS = [ch1, ch2, ch3, ch4, ch5, ch6, ch7, ch8, ch9].filter((c) => c.levels.length);

// Flat list; every level knows its chapter index and number inside the chapter.
export const LEVELS = CHAPTERS.flatMap((c, ci) => c.levels.map((l, li) => ({ ...l, chapter: ci, inChapter: li })));
