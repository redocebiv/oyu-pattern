# Oyu Pattern

A procedural generator for Kazakh ornament — *ою*. Pick a motif, set the
symmetry, and it composes felt-carpet layouts and seamless repeating tiles.
Export as SVG or PNG.

**Try it: https://redocebiv.github.io/oyu-pattern/**

Everything runs in the browser. No build step, no dependencies, no server,
nothing uploaded.

## Why it shows two carpets

Kazakh felt mosaic — *сырмақ* — is not printed or dyed. Two sheets of felt in
different colours are stacked, the ornament is cut through both at once, and the
cut pieces are then exchanged and sewn back. One cut yields **two carpets: a
positive and its negative twin.**

That is why this generator always shows a pair rather than a single design. The
twin is not a colour-inversion filter bolted on afterwards — it is what the craft
actually produces, so it is built into the output.

## The motifs

The horn — *мүйіз* — is the primary element of Kazakh ornament, and its arcuate,
spiralling line runs through nearly every motif. Motifs are named after the
animal parts they derive from.

| Motif | Meaning | Form |
|---|---|---|
| қошқар мүйіз | ram's horn — wealth, fertility, vitality | a stem with two horns curling outward |
| қос мүйіз | paired horns | two horn units joined base to base |
| түйе табан | camel's foot — a safe journey | a cloven print, two toes over a heel |
| тұмарша | amulet — wards off the evil eye | nested triangles with a pendant bead |
| төртұшкүл | four sharp angles | four rhombi meeting at one point, star-like |
| су | running water | a wave band, for borders |
| ирек | zigzag | an angular band, for borders |

## The colours

Colour carries meaning, so each palette is named and its meaning shown rather
than being presented as an anonymous swatch.

| Colour | Meaning |
|---|---|
| көк — blue | the sky, and Tengri |
| қызыл — red | fire and the sun |
| ақ — white | joy and happiness |
| сары — yellow | knowledge and wisdom |
| жасыл — green | spring and youth |
| қара — black | the earth |

Six palettes are built from these, and two colour pickers cover anything else.

## Using it

**Carpet** composes a bordered field the way a syrmaq is laid out: a running
band around the edge, a motif in each corner square, and a grid of motifs in the
field with alternate rows mirrored. **Tile** produces a single seamlessly
repeating unit, shown repeated on screen so any seam would be obvious.

Sliders control columns, stroke weight and motif scale. A heavy stroke reads as
the fat felt ribbon of a real carpet; a light one reads as fine line ornament.
The same geometry serves both.

**Generate** rolls a new seed. The complete state lives in the URL, so every
pattern is a shareable link and the back button works — copy the address bar and
whoever opens it sees exactly the same ornament.

Export gives a real vector SVG, a 2048px PNG, or the SVG source straight to the
clipboard.

## How the tiling works

Motifs are allowed to cross the edge of their cell. The cell's contents are
emitted nine times — at every neighbouring position, one cell up, down, left and
right — and clipped back to the cell. Anything that leaves one edge therefore
re-enters the opposite one, and the tile is seamless *by construction* rather
than by careful placement.

The property is checked two ways: a test asserts that every instance appears at
all nine offsets, translated by whole cells only, and the rendered result was
measured for periodicity — across the wrap the pixel difference is 0.4 where the
worst neighbouring pair inside the tile differs by 37.

## Running it locally

Any static file server. Opening `index.html` from the filesystem will not work,
because browsers refuse to load ES modules over `file://`.

```bash
python3 -m http.server 8000
```

## Tests

Dependency-free, no framework. They cover the parts that are genuinely hard to
check by eye: seeded reproducibility, valid path output, symmetry groups
(reflections are told from rotations by determinant sign), the tiling wrap
invariant, carpet layout geometry, and URL state round-tripping including
hostile input.

```bash
npm test
```

Or run any one directly, for example `node tests/compose.test.mjs`.

## Built with

Vanilla JavaScript ES modules. No dependencies, no build step. Geometry is kept
strictly separate from rendering — the composition engine returns plain data and
never touches the DOM, which is what lets it be tested under plain node.

## Licence

MIT
