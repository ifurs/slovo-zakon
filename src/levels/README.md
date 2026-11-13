# Level design guide

Each chapter is a file `src/levels/chN.js` exporting `{ name, levels: [...] }`.
A level is:

```js
{
  name: 'Назва рівня',            // Ukrainian, unique across ALL chapters
  hint: 'Коротка підказка.',      // Ukrainian; a nudge, never the full solution
  solution: 'UURR.DDL',           // U D L R moves, . = wait; spaces allowed
  map: [ '....', '....' ],        // equal-length rows, max 20 wide x 14 tall
  extra: [['x', 3, 4, 'down']],   // optional: stacked objects / start direction
}
```

## Map legend

Objects (lowercase):

| char | object | char | object |
|---|---|---|---|
| `h` | їжак (hedgehog) | `k` | ключ (key) |
| `w` | стіна (wall) | `d` | двері (door) |
| `c` | ящик (crate) | `t` | дерево (tree) |
| `a` | яблуко (apple) | `r` | камінь (rock) |
| `~` | вода (water) | `m` | гриб (mushroom) |
| `f` | вогонь (fire) | `i` | лід (ice) |
| `x` `y` `^` `v` | лис (fox) facing right / left / up / down | `.` | empty |

Words (text tiles):

| char | word | char | word |
|---|---|---|---|
| `H` | ЇЖАК | `=` | ЦЕ (is) |
| `W` | СТІНА | `&` | І (and) |
| `C` | ЯЩИК | `1` | ТИ (you) |
| `A` | ЯБЛУКО | `2` | ПЕРЕМОГА (win) |
| `V` | ВОДА | `3` | СТОП (stop) |
| `F` | ВОГОНЬ | `4` | ШТОВХ (push) |
| `K` | КЛЮЧ | `5` | СМЕРТЬ (kills ТИ) |
| `D` | ДВЕРІ | `6` | ВИР (sink) |
| `T` | ДЕРЕВО | `7` | ВІДМИЧКА (open) |
| `R` | КАМІНЬ | `8` | ЗАМОК (shut) |
| `X` | ЛИС | `9` | РУХ (move) |
| `G` | ГРИБ | `Z` | ЖАР (hot) |
| `I` | ЛІД | `M` | ТАНЕ (melt) |
| `S` | СЛОВО (= every word tile) | | |

## Exact rules of the engine (`src/engine.js`)

- **Reading.** A rule is `NOUN [І NOUN]* ЦЕ (PROP|NOUN) [І (PROP|NOUN)]*`, read only
  left→right or top→bottom. One `ЦЕ` can make a horizontal and a vertical rule at once.
- **Words** are always pushable. `СЛОВО` means all word tiles, so `СЛОВО ЦЕ ТИ`, `СЛОВО ЦЕ СТОП`,
  `СЛОВО ЦЕ ВИР`… apply to the words. Words never transform (`СЛОВО ЦЕ ЇЖАК` does nothing).
- **Objects with no properties** are decoration: you walk through them.
- **The board edge** blocks everything.
- **A turn:**
  1. every ТИ object moves in the input direction (front-most first, so a line of ТИ walks together);
     pushing: ШТОВХ objects are pushed along (a chain must be free to move), СТОП blocks
     (unless the blocker is also ШТОВХ). A ВІДМИЧКА may enter a ЗАМОК cell even if it is СТОП.
  2. every РУХ object steps forward in its facing; if blocked it turns around and tries once
     (it can push things too).
  3. Rules are re-read. `NOUN ЦЕ NOUN` transforms every object of the first kind
     (`X ЦЕ X` protects X from transforming).
  4. Interactions, per cell: anything sharing a cell with a ВИР object → everything in that cell
     is destroyed; СМЕРТЬ destroys ТИ objects in its cell; ЖАР destroys ТАНЕ objects in its cell;
     a ВІДМИЧКА and a ЗАМОК in the same cell destroy each other.
  5. Win: a ТИ object shares a cell with a ПЕРЕМОГА object (or is both).
     Lose: no ТИ object exists (player must undo).
- Space (`.`) waits a turn: only РУХ objects move.

## Tools

```bash
node tools/solve.mjs <chapter> [level]          # shortest solution by BFS (700k state limit)
node tools/replay.mjs <chapter> <level> [moves] # replay moves (default: level.solution), draw board
node --test                                     # all tests incl. every stored solution
```

`replay` draws the board with the same legend (`*` = several objects in one cell) and lists the
active rules, which is the easiest way to debug a design.

## What makes a good level

- **One clear idea ("aha")** per level. The hint nudges toward it without spelling it out.
- **No shortcuts.** Run the solver. Its shortest solution must use the intended idea; if it finds a
  cheaper trick (breaking a rule you meant to be fixed, pushing words into water as a bridge,
  walking around an obstacle…), change the map. Lock rules that must stay fixed behind a wall:
  a row of words outside a full row of `w` that the player cannot reach (still read by the engine).
- **No dead weight.** Every word and object should matter or be a deliberate red herring.
- **Compact boards** (typically 11–17 wide, 7–12 tall). Bigger boards are slower to search and
  rarely better.
- **Ramp** inside a chapter: first levels introduce the chapter's mechanic gently, the last ones
  combine it with earlier mechanics and are genuinely tricky (shortest solution usually 25–60 moves).
- **Store a solution**: the solver's shortest path when it finds one; otherwise a hand-written one
  checked with `tools/replay.mjs`. `node --test` must pass.
