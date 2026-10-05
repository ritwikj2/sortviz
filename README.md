# sortviz

Race sorting algorithms as they reassemble the same shuffled picture. A small,
static site made with HTML, CSS, and JavaScript: no dependencies, build step,
external assets, or runtime services. Images stay in your browser.

Each picture tile is an integer in a row-major array; sorting the array restores
the picture. Every selected algorithm starts with the same seeded Fisher–Yates
shuffle and receives the same number of events per animation frame.

## Run locally

From this directory:

```sh
python3 -m http.server 8000
```

Open `http://localhost:8000`. Use the procedural demo, choose a picture, or drop
or paste an image. Images are scaled to at most 1,024 pixels on their longest side
and cropped to a centered square. Choose a grid, edit the seed, and press Play.
Reset restores the current shuffle; Shuffle generates a new seed.

Space plays or pauses, Right Arrow steps, R resets, and S shuffles. Shortcuts leave
focused form controls alone. Nothing plays automatically; reduced-motion users
start at a lower speed.

## Tests

Requires Node.js 22 or newer; no installation is needed:

```sh
node --test test/
# or
npm test
```

Tests check sorting, bounds, seeded permutations, immediate event replay, early
exit, and bogo's hard cap. The one-line `test/index.js` supports the directory
command on Node 22. Large bogo completion tests are skipped; a tiny sort and its
exact 2,000-shuffle limit are tested separately.

## Algorithms and counts

Bubble (early exit), cocktail shaker, odd–even, gnome, insertion, selection, Shell
(3x+1 gaps), comb, heap, top-down merge, quick (middle-pivot Lomuto), counting,
base-4 LSD radix, and opt-in bogo.

One step is a comparison, swap, or write to the displayed array. A swap counts as
two writes. Auxiliary array operations are excluded, so this is an event race,
not a wall-clock benchmark. Merge, counting, and radix expose every write-back,
including intermediate duplicate tiles. Counting and radix use integer keys
in `0..n-1`. Bogo stops after at most 2,000 shuffles and reports “Gave up.”

Complexity labels are worst-case upper bounds (Shell's is conservative);
quick sort averages O(n log n). For counting, k is the key range; for radix, d
is the number of base-4 digits. Grids range from 4×4 to 32×32.

## GitHub Pages

Push this directory to the `main` branch of your repository. In **Settings →
Pages**, choose **Deploy from a branch**, then **main** and **/ (root)**. Save.
All asset paths are relative, so project subpaths work without configuration.

## License

MIT. Copyright © 2026 Ritwik Jagadish Pooja.
