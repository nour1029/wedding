# Image assets

## Provenance

Everything here came from the reference site
(`webgencyinvitations.com/thesacredgarden`), at the user's explicit request.

| File | Origin |
|---|---|
| `hero-scene.jpg` | Derived from the site's OG preview image, `Screenshot_2026-06-2.png` |
| `hero-floral-left.png` | Tilda CDN `tild6639-3363-4136-a234-356639363561` — despite the filename, the reference actually places this on the invite card, not the hero; see below |
| `hero-floral-right.png` | Tilda CDN `tild3764-3461-4436-a562-636534643333` — same |
| `bismillah.png` | Tilda CDN `tild3438-6238-4236-b537-366632636138`, 1022×312 |
| `invite-card-bg.png` | Tilda CDN `tild3134-6461-4832-a236-633431616631`, cropped to its opaque bounds and resized from 1680×833 |
| `envelope-closed.jpg` | Cloudflare R2 `pub-96ce671efbac…`, the gate's still |
| `../video/envelope-open.mp4` | Cloudflare R2 `pub-96ce671efbac…`, the opening film |
| `_source/keep/venue-line-art.png` | Tilda CDN `tild3637-3939-4864-a263-333836383139`, for Phase 8 |

> **None of this is ours.** It is most likely licensed stock or commissioned
> artwork. Low risk while the page is a local file; a real one once it is on a
> public domain with your names on it. Commissioned or licensed replacements
> drop in under the same filenames with no code change.

## How `hero-scene.jpg` was made

The arch, columns, vines, lake and swans are **not** on the live reference
site any more — its hero now uses a torn-paper card and two floral cutouts,
and every block background there is a flat colour. The only surviving copy of
that scene is the site's OG preview image, which is a screenshot of an earlier
version **with the couple's names painted into it**.

So the text was removed programmatically:

1. Detect gold glyph pixels — `r ≤ 228`, `r−b ≥ 55`, `g−b ≥ 20` — which
   separates the gold lettering from both the warm stone (`r−b ≈ 42`) and the
   cream ground (`r−b ≈ 29`).
2. Restrict that mask to the central box where the text sits. The same colour
   test also matches rose centres, which must survive.
3. Dilate by 3px so antialiased glyph edges go too, otherwise a gold halo is
   left behind.
4. Repaint each masked run by interpolating between the nearest clean pixel to
   its left and right on the same row. Glyph strokes are narrow and the ground
   behind them is flat cream, so this is seamless.

The script is `_source/keep/clean-hero-text.py`. Re-run it against
`_source/keep/hero-scene-original-with-text.png` if the plate ever needs
redoing.

**Consequence:** the names, date and "Scroll down" on the hero are live text
from `WEDDING`, not pixels. Changing the couple's names changes the hero.

## Working sizes

`_source/keep/` holds the untouched originals. Shipped files are resized to
what the layout actually displays.

`hero-scene.jpg` is 981×1558 — the largest the source exists at. It is JPEG
because it is a full-bleed photograph-like plate with no transparency; the
florals stay PNG because they need alpha.

No WebP build: no `cwebp`, ImageMagick, or WebP-capable `sips` on this
machine. For roughly a 30–40% saving on the scene:

```sh
brew install webp
cwebp -q 82 hero-scene.jpg -o hero-scene.webp
```

Then wrap the `<img>` in a `<picture>` with the JPEG as fallback.


## The envelope

The gate is the reference's own two-stage sequence: a still of the sealed
envelope, then a 4.8s film of it opening which dissolves as it ends. Both come
from the reference's Cloudflare R2 bucket, not Tilda.

**The wax seal reads `R&Z` in both the still and the film.** Unlike the hero,
this is not live text and cannot be swapped — it is embossed wax, lit and
photographed, and it moves in the video. Different initials mean new artwork
for both files. `WEDDING.couple.monogram` no longer drives the gate.

The still was 2.4MB as PNG with no transparency; re-saved as JPEG at 253KB.
The film is 3.5MB and could not be re-encoded — no ffmpeg on this machine.
That is the single heaviest thing a guest downloads, and it is on the critical
path since it is the first screen. Worth an `ffmpeg -crf 30` pass before
launch:

```sh
brew install ffmpeg
ffmpeg -i envelope-open.mp4 -vcodec libx264 -crf 30 -preset slow \
       -movflags +faststart -an envelope-open-small.mp4
```

## The hero scene video

`../video/swans.mov` is the hero. It is not just the swans — it is the whole
painting, animated: the swans drift, blossom petals fall, light shifts across
the arch. 720x1280, 8.06s, looping.

`hero-scene.jpg` is now its **poster**, not the hero itself. The video only
starts once the guest is through the envelope, so nothing pulls 7MB before
they have opened it.

Three things about this file are worth knowing:

**It is HEVC (h.265) in a QuickTime container.** Safari plays it everywhere.
Chrome on macOS plays it via the system decoder. Firefox does not, and Android
and Windows Chrome depend on the device. Where it cannot decode, the poster
stays on screen — the same artwork, just still — so nothing ever breaks. This
is why the poster matters and why the still plate was worth making.

**Do not use `<source type="video/quicktime">`.** Browsers filter `<source>`
by declared type, and Chrome reports no support for quicktime even where it
decodes the file happily, so the video silently gets no source at all
(`networkState: 3`). Setting `src` directly on the `<video>` lets it sniff.
The reference sidesteps this by labelling its `.mov` as `video/mp4`.

**It was not faststart.** As downloaded, the `moov` atom sat at byte 7,313,055
of 7,319,318 — the very end — so a browser had to fetch all 7MB before it
could show one frame. `_source/keep/faststart.py` rewrites it with `moov`
first, patching every `stco` chunk offset by the size of the moved atom
(those offsets are absolute file positions, so they must shift or playback
breaks silently). `moov` now sits at byte 28. The envelope film was already
faststart.

## Page weight

The two videos are 10.5MB together and both are on the critical path. Neither
could be re-encoded here — no ffmpeg. Before launch:

```sh
brew install ffmpeg
# H.264 alongside the HEVC, so Firefox and Android get motion too:
ffmpeg -i swans.mov -vcodec libx264 -crf 30 -preset slow -an \
       -movflags +faststart swans.mp4
```

Then offer both, H.264 first, and everyone gets the animation.


## Countdown and Schedule (matched to the live reference)

The reference's Countdown is not a card at all — it's a self-contained coded
widget (Ovo digits in a shimmering gold-gradient text-clip, wiped open on
scroll, each unit rolling out and back in on change rather than the text
just overwriting). That behaviour is reproduced in `js/main.js`
(`initCountdown`, `flipDigit`) and `css/style.css` §9.2 directly from the
reference's own inline `<style>`/`<script>` — colours retokenised to
`--gold`/`--gold-light`, everything else near-identical, including the exact
per-unit stagger delays.

Schedule was first done as a partial pass — our own hand-built torn-paper
card and timeline, with only the flourishes and the flower swapped for the
reference's assets. It has since been cloned properly; see "Schedule of
Events" below for how the card and type actually work now. The assets:

| File | Origin | Used for |
|---|---|---|
| `schedule-flourish-left.png` | Tilda `tild3638-3336-4136-a131-…` | Left of "Schedule of Events" |
| `schedule-flourish-right.png` | Tilda `tild6131-6362-4663-b461-…` | Right of "Schedule of Events" |
| `schedule-rose.png` | Tilda `tild3363-3665-4330-a361-…`, resized from 1309x1201 | Crowning the timeline rule |
| `schedule-card-top.png` | Tilda `tild6638-3365-4663-b834-…`, 1680x652 | Card's torn top edge |
| `schedule-card-bottom.png` | Tilda `tild3633-3739-4961-b135-…`, 1680x563 | Card's torn bottom edge |

These are scoped to the Schedule heading only, via a `.heading--schedule`
modifier — the shared `.heading--flourished` filigree (Location, RSVP, Dress
Code) is untouched, since those headings' own reference assets haven't been
checked yet.

**Found along the way, not (yet) acted on:** fixing the real flourish images
in exposed a pre-existing bug — the flourish min-width floor (added when the
desktop zero-width bug was fixed) was tuned against bare section headings
and was too generous for a heading sitting inside a card's extra padding,
wrapping "Schedule of Events" back onto two lines at phone width. The
coefficient was lowered (8vw → 5.5vw); re-verified clean at 320/390/1280.

## Bismillah / invitation card (matched to the live reference)

Same treatment as Schedule: the reference's own art replaces every
hand-drawn approximation on this card.

- **`bismillah.png`** stands in for what used to be live Arabic text. The
  reference doesn't set the phrase in a font at all — it's a calligraphy
  graphic. Accessibility isn't lost: the `<img alt>` carries both the Arabic
  and an English translation.
- **`invite-card-bg.png`** replaces the CSS torn-paper mask
  (`css/style.css` §5.3, `.card`) for this card only, via a `.card.invite`
  override. The source PNG (1680×833) has the torn card art centered in a
  much wider transparent canvas; it's cropped to the art's own opaque
  bounds before shipping. Straight left/right edges, torn top/bottom — same
  shape the CSS mask already produced, now a photograph instead of a
  gradient trick. Worth a pass with `pngquant`/`cwebp` before launch (445KB,
  no compressor available on this machine — see "Page weight" above).
- **`hero-floral-left/right.png`** turn out to belong to this card, not the
  hero — the reference's own layout has them draped over the card's torn
  top edge (roughly 55% of their height above it, inset ~17.6% from each
  side), which is why `.invite__ivy` positions them with a negative
  `translateY` rather than sitting flush inside the card like the old
  placeholder slots did.
- **`invite-ivy-left.webp` / `invite-ivy-right.webp`** are the primary
  source now (PNGs are the `<picture>` fallback for non-WebP browsers),
  pulled directly from Tilda's own optimizer (`optim.tildacdn.net`) rather
  than re-encoded here — this machine has no `cwebp`. Sized at 436×/420×,
  the same widths the reference's own JS requests them at, ~5-6× lighter
  than the PNGs (58KB/51KB vs. 299KB/280KB).
### Getting the placement right (measured, not estimated)

Two earlier attempts at these numbers were wrong because they were derived
from the raw HTML's `data-field-*` attributes. Those are authored against
Tilda's 1200px design canvas and, crucially, the card image's element box
is **30% wider than the card actually looks** — the source PNG floats the
torn paper inside a wide transparent canvas (opaque bounds are x 233→1530
of 1680). Any ratio taken against the element box is therefore ~30% too
small.

The values in `css/style.css` §9.1 come from measuring the **rendered**
reference in Chrome and normalising against its *visible* paper:

| | left floral | right floral | Bismillah |
|---|---|---|---|
| width (% of card) | 39.0 | 41.1 | 49.3 |
| inset from that edge | 4.8% | 11.2% | centred |
| above card top (% of own height) | 54.5 | 57.5 | — |

The two florals are one swag, not a pair of corner accents: together they
span ~5%→89% of the card's width with a ~4% gap at centre, and their
trailing vines hang *past* the Bismillah on both sides. The left/right
asymmetry is in the reference too — the art is not mirrored.

**Two CSS traps cost the most time here, both silent:**

1. The `<picture>` wrappers were becoming the containing block for the
   absolutely positioned images inside, so every percentage resolved
   against the card's *content* box instead of its full width — florals
   landed ~10% too small and too far in, with no error anywhere. Two
   independent causes, each sufficient on its own: `.card > *` sets
   `position: relative` (for the `::before` grain, which this card
   doesn't have), and the stagger reveal sets `transform:
   translateY(20px)` on every direct child — a transformed element is a
   containing block for absolutely positioned descendants. The transform
   one also *animates*, so the florals would have slid into place a beat
   behind the card. Both are overridden in §9.1; note the override needs
   specificity (0,2,0) to beat `.js [data-reveal-stagger] > *`.
2. `.bismillah` is in normal flow, so its `%` width resolves against the
   content box while the florals' resolve against the padding box. Its
   width adds the inline padding back before taking the 49.3% share; the
   florals must not.

Watch for the same thing when measuring: `.is-revealed` goes on the
stagger *container*, and the children take 0.7s to settle — sampling
`getBoundingClientRect()` immediately after adding the class reads a
position 20px out, mid-transition.

**One font swapped deliberately, not matched exactly.** The reference's
"Two Souls / One destiny / A Lifetime written by Allah" and its Tilda
`font-family` both resolve to real fonts we could identify by their
`@font-face` `src` URLs:

| Reference text | Resolves to | License |
|---|---|---|
| "Two Souls…" (gold, `#A67D2B`) | Imperial Script | Free — SIL Open Font License, on Google Fonts |
| "Dear Friends…" / body (`#6A5140`) | GT Super Display Light | Paid — Grilli Type commercial license |

Imperial Script is now loaded (`index.html`) and used for `.invite__line`
— an exact match. GT Super Display Light is not: it's a paid commercial
typeface and its `.woff` isn't ours to copy off Tilda's CDN and re-host,
unlike the images (most likely licensed stock, but at least not a font
foundry's own paid product). `.invite__greeting` and `.invite__body` keep
Ovo, the sitewide body font, with the reference's exact text colour. If a
licensed copy of GT Super Display is ever obtained, drop its `.woff` into
`assets/fonts/` and point `--font-body` at it for this card only.
## Schedule of Events (cloned from the live reference)

Measured off the rendered reference rather than its markup, for the same
reason as the invitation card: its `data-field-*` values are authored
against a 1200px canvas and its card images float the artwork inside a
wider transparent frame (opaque bounds x 233→1530 of 1680, so the element
box is ~30% wider than the paper looks).

**The card is two photographs, not one.** `schedule-card-top.png` is torn
along its top edge and flat below; `schedule-card-bottom.png` is flat on
top and torn along the bottom. The reference stacks them with a gap in
between, which is how its card can be any height without stretching the
tear. Ours does the same through `.card--paper`: the two strips anchored
top and bottom at `100% auto`, over a fill.

Both were cropped to the torn band plus enough flat paper to blend
(130 of 652 and 563 rows) and shipped at 1112px wide — 2× the desktop
card — which keeps them ~115KB each instead of ~600KB for the full
plates. The fill is `#F1E5D4`, the exact tone of the rows the strips join
on: the paper samples within 1–2/255 across its whole height, so the
seams are invisible. This is a better card than the `--torn-*` CSS mask
in §5.3 and `.card--paper` is written to be reusable if other sections
want it.

Type and colour, all as rendered by the reference:

| | font | size / line-height | colour |
|---|---|---|---|
| "Schedule of Events" | Imperial Script | 41 / 64 | `#A67D2B` |
| "5 PM" | Ovo | 30 / 47 | `#846F61` |
| "Guest Arrival" | GT Super Display Light → Ovo | 20 / 22 | `#6C513F` |
| rule | — | 1px | `#9C8575` |
| node | — | 8px, rotated 45° | `#8C7666` |

The reference's `NewFonts` weight 600 resolves to **Ovo-Regular**, which
is already `--font-body` — so the times are an exact match, not a stand-in.
Only the labels substitute (weight 100 is GT Super Display Light, the paid
font noted above).

Rows are 78px centre to centre. The peony is centred on the *first node*,
not floated above the rule — measured, its centre and the first diamond's
centre are the same point.

**Two things that needed solving rather than copying:**

- The peony is 55px wide over an 11px node, so it reaches ~22px past the
  column either side and lands on "5 PM" and the first label unless the
  grid's column gap clears it. The reference has ~17px of daylight beyond
  the flower; ours now matches at every width.
- On a phone the reference's scrollwork sits hard against the screen
  edges (1px and 390px on a 390 screen) — possible only because its card
  is wider than the screen. Ours fits the screen, so below 484px the card
  drops its gutters and the heading reclaims the card's inline padding
  with a negative margin. Without that the flourishes get starved to
  ~28px against the 41px title; with it they reach 52px on a phone and
  the reference's full 79px on desktop.

## The rose's scroll-scrubbed travel (now implemented)

Previously noted as skipped: "the reference's scroll-scrubbed rose-travel
animation... decided as out of reasonable scope." Checking why the rose
looked mispositioned revealed it wasn't static in the reference at all —
its `data-animate-sbs-event="scroll"` carries 5 keyframes that walk the
peony down from the first node to the last as the guest scrolls the
section, triggered around the viewport's midpoint. A screenshot taken
mid-scroll will always show it sitting on whichever node the scroll
position implies, not the first one.

Reproduced in `js/main.js` (`initScheduleRose`): progress runs 0→1 as the
timeline's own top-to-bottom sweeps through the viewport's vertical
centre, and the rose is shifted by `progress × (distance from the first
node's centre to the last node's centre)` via a `--rose-shift` custom
property `.timeline::after` reads. Measuring the actual node centres
rather than assuming even `--row` spacing means it still lands correctly
if a label ever wraps to two lines and grows a row.

Degrades safely: `--rose-shift` defaults to 0px, so with JS disabled or
`prefers-reduced-motion` set, the rose simply stays at the first node —
never missing, never mid-transform.

---

# Location (built from your own artwork, not the reference)

Everything above came off the reference site. This section did not — it was
extracted from the Location artwork you supplied, kept at
`_source/location-design-original.png` (1402×1122). It is also the first
section carrying your real venue rather than the placeholder one.

| File | Origin | Used for |
|---|---|---|
| `venue-building.png` | Cut from the design at x 138–1245, y 538–1069 → 1108×532 | The line drawing of the hall |
| `venue-divider.png` | Cut from the design at x 602–804, y 272–319 → 203×48 | The rule-and-palmette under the heading |

`_source/keep/venue-line-art.png` (the reference's own building, downloaded
back in Phase 8) is now unused — superseded by the real venue.

## Extracting the art: ink over paper, not a cutout

Both files are transparent PNGs recovered with
`_source/keep/extract-location-art.py`. The drawing is ink laid over the
design's paper, so each pixel is `C = A·F + (1−A)·B` for a known paper
`B = #FBEEDE`. Solving per pixel — `A = maxᵢ (Bᵢ − Cᵢ)/Bᵢ`, then
un-premultiplying `F` — gives back the ink's own colour and coverage.

This matters more than a plain background knockout would. The hall's stone
is drawn as a *wash*, barely darker than the paper; a cutout would have to
either keep it as an opaque cream rectangle (visibly a different cream from
our card) or discard it. Recovered as ink, the stone is mostly transparent
and simply takes on whatever paper it is placed over — which is why the
drawing sits on our slightly darker `.card--paper` fill (`#F1E5D4`) without
a seam.

Two checks that the un-compositing is sound:

- Only 0.80% of pixels in the drawing's box are *lighter* than the paper,
  and by at most 4/255 — noise, not highlights. So "ink over paper" is the
  right model and nothing is lost by clamping.
- Composited over magenta, there is no cream halo anywhere — the giveaway
  that alpha and colour have been separated correctly.

Alpha below 6/255 is dropped, which kills the paper grain that would
otherwise ride along as a faint rectangle.

`venue-building.png` is then quantised to 96 colours: **831KB → 189KB**, and
indistinguishable at display size (checked at 2× zoom on the dome and
signage). WebP was tried and abandoned — for artwork this finely textured it
came out *larger* than the quantised PNG at every quality setting worth
using, so a `<picture>` would add markup for nothing.

## Colours, sampled not eyeballed

Taken from the strokes' *interiors* — pixels whose eight neighbours are all
ink too — so antialiasing against the paper cannot lighten the reading:

| | sampled | note |
|---|---|---|
| "Location" | `#A78031` | deeper and browner than the site's `--gold` `#B08D3E`; scoped to this heading |
| "Laveora Wedding Hall" | `#513B27` | |
| Address | `#412F1D` | |

## Geometry, and the two places it deliberately departs

Every size and gap is the design's own, expressed as a fraction of its card
width so it holds at any column width. Measured against the rendered result
rather than assumed: each band now lands within **0.8% of the card width**
of the design at both 390px and 1470px, and the drawing is 78.97% of the
card against the design's 78.89%.

| | design (% of card) | ours |
|---|---|---|
| heading ink top | 12.48 | 12.43 |
| divider top / width | 19.61 / 14.48 | 19.36 / 14.53 |
| venue name ink top | 24.75 | 24.95 |
| address line 1 ink top | 30.60 | 30.98 |
| drawing top / width | 39.51 / 78.89 | 40.29 / 78.97 |

Departures, both deliberate:

- **Type runs ~13% larger against the card.** The design is a 1402px render;
  our card is 556px at its widest. Scaled by strict proportion the address
  would print at about 13px in a phone column. It is held at the site's body
  size instead, and the *positions* still match.
- **The heading keeps the site's shared `--t-script-lg`**, so "Location" is
  the same size as "Schedule of Events" and "Confirm Your Attendance" a
  screen away. Matching the design here would have made this one heading
  smaller than its neighbours for no reader-visible gain.

Two smaller things worth knowing, since both look like mistakes in the CSS:

- `.venue__divider` has a **negative** top margin, `-0.15 × --t-script-lg`.
  The script L's swash makes the heading's line box reserve descender space
  whether or not the swash descends there; the negative margin takes it back.
  Tied to the heading's size so it scales with it.
- `.venue__card` uses **percentage** inline padding (4.3%), not the shared
  24px gutter. A fixed gutter is 4.3% of the 556px desktop card but 6.2% of
  a 390px phone one, so the drawing — sized against the content box — was
  quietly losing 4% of the card on the way down to a phone.

## The address breaks where the design breaks it

`initVenue` renders one `<span>` per `WEDDING.venue.addressLines` entry
rather than joining them into a paragraph, so the break lands after
"…6th of October City," exactly as the design has it instead of wherever
the column happens to run out. `display: contents` on the wrapper lets the
first line sit inline beside the "Address:" label while later lines each
start a new one.

## The map has no pin yet

`WEDDING.venue.coords` is `null` on purpose. Nobody has supplied the hall's
coordinates, and a guessed lat/lng drops a pin on the wrong building with
complete confidence — worse than no pin at all. While it is null both the
embed and the Open in Maps link search the address text instead, and Google
does in fact resolve it to the real listing (Laveora, `2X57+VF`, 4.6★).
Zoom is held at 13 rather than 16 until there is a real pin to zoom to.

To pin the door exactly: right-click the hall in Google Maps, the first menu
item is the lat,lng, paste it in as `coords: { lat: …, lng: … }`. Nothing
else needs to change.

---

# The couple photo (yours)

> **Branch note:** on `mohamed-tamer`, `couple.jpg` is a different photo —
> see "Mohamed & Sohila's closing photo" below. Everything else on this
> page (rotation history, encoding rationale) describes the file as it
> exists on `master`, for Mazen & Shams.

| File | Origin |
|---|---|
| `couple.jpg` / `couple.webp` | Your own photo, supplied 2026-08-14 |
| `_source/couple-original.png` | As received, before rotation and encoding |

Not from the reference site, and not stock — the second genuinely personal
asset here after the Location artwork. It does not carry the licensing
caveat at the top of this file.

## The faces are covered

The photo arrived with fire emoji stickers over both faces. They have been
left exactly as supplied — no attempt was made to remove them, and none
should be: reconstructing a face under an overlay invents a person who was
never in the frame.

If the stickers were a privacy measure for sending the file and the real
invitation should show the couple, send the unstickered original and it
drops in under the same filenames with no code change. If they are meant to
stay, nothing more is needed.

## Rotation — shipped un-rotated, on request

The file is 818×1280 portrait with the couple lying sideways in the frame.
The phone recorded the quarter turn in EXIF rather than in the pixels and
the PNG export dropped the tag — it even carries `Orientation: 1`
("upright"), which is why nothing auto-corrects it.

It was briefly shipped rotated 90° clockwise to 1280×818, which puts them
the right way up and reads as a normal room: sofa behind, wall and window
above, throw hanging down. **That was reverted at your request** — the page
now shows the original file at its own dimensions, so the couple appear
sideways exactly as the file has them.

To put the rotation back, it is one call in the encode step:

```python
Image.open('_source/couple-original.png').convert('RGB').rotate(-90, expand=True)
```

then swap the `width`/`height` attributes on `.closing__photo` to
`1280`/`818` and the `max-width` on `.closing__figure` to match.

## Encoding: JPEG only, and why the WebP was removed

WebP normally wins on photographs, so this one shipped with a `<picture>`
and a WebP alternate at first. Measured against the original, it does not
win here — and because browsers prefer WebP, the alternate meant the *worst*
version was the one actually being served:

| | size | PSNR vs original |
|---|---|---|
| WebP q82 (was being served) | 80KB | 39.7 dB |
| WebP q92 | 151KB | 43.4 dB |
| **JPEG q92 (shipped)** | **146KB** | **48.2 dB** |

JPEG beats WebP at the same file size by nearly 5 dB. The likely reason is
that this file has already been through JPEG compression once on its way
here, so it carries JPEG-shaped artefacts that re-encode cheaply as JPEG and
expensively as WebP. Whatever the cause, the numbers are the numbers: the
`<picture>` was dropped for a plain `<img>`.

48.2 dB is comfortably into visually-lossless territory — the average pixel
is off by about 1 part in 255 from the original.

## Shown whole, at the original dimensions

- **No `aspect-ratio`, no `object-fit`.** The box takes the photo's own
  shape, so nothing is cropped off any edge. The `width`/`height` attributes
  in the markup supply the intrinsic ratio, so the space is reserved before
  the file arrives and nothing below jumps on load.
- **Capped at 818px**, the file's own width. This is arithmetic, not taste:
  the photo is portrait, so width and height trade off directly, and running
  it edge to edge on a 1470px window would make it **2300px tall** — two and
  a half screenfuls of one photograph — while enlarging it 1.8× to get
  there. At native width it is still full-bleed on every phone (390px gives
  a tall 390×610 band, measured) and never enlarged anywhere, which also
  retires the softness the landscape version had on large monitors.

Measured: 818×1280 at scale 1.000 on a 1470px window, 390×610 at 390px.

---

# Link preview (Open Graph / Twitter Card)

> **Branch note:** on `mohamed-tamer`, `og-image.jpg` is a different photo —
> see "Mohamed & Sohila's link preview" further down. Everything else on
> this page describes the file as it exists on `master`, for Mazen & Shams.

| File | Origin |
|---|---|
| `og-image.jpg` | `_source/og-image-childhood-with-link-icon-original.jpg`, supplied ready-cropped |
| `_source/og-image-childhood-with-link-icon-original.jpg` | As supplied — the same childhood polaroid, this time with a link-share icon baked in |

## Current: the childhood polaroid, with the link-icon watermark

Same photo as the version below (two kids hugging, curtain backdrop), but
supplied a second time with a white chain-link badge over the centre — the
same kind of share-link icon macOS stamps onto an image when generating a
shareable link (seen once already on the couple photo, see "Superseded"
below). Asked for explicitly, twice, "as it, with its water mark" — installed
unmodified, no cropping needed since it arrived already at 1200×630.

Re-encoded straight to JPEG q92 (no crop step, source was already the right
shape): 94KB. The original PNG this was converted from lived only in this
session's image cache and wasn't retained past it — `_source/
og-image-childhood-with-link-icon-original.jpg` is the re-encoded JPEG
itself, kept as the closest available record.

## Superseded: the childhood polaroid, no icon

Explicitly not the couple photo used in Closing — this is an old polaroid
(two kids hugging, curtain backdrop) supplied separately and asked for by
name as the OG image, nothing else. Scaled to 1200px wide (896→1200,
×1.339) then cropped to the standard 1200×630 OG shape:

```python
Image.open('_source/og-image-childhood-original.png').convert('RGB') \
     .resize((1200, round(909 * 1200/896)), Image.LANCZOS)  # → 1200×1217
     .crop((0, 260, 1200, 890))                              # → 1200×630
```

Crop chosen to keep both faces and the hug whole with a little headroom
above; it trims the blank curtain at the top and the thick polaroid border
and stuffed animal at the bottom. The thin polaroid edge left standing on
the sides and top is kept deliberately — on a photo this square, cropping
it away entirely would have meant cutting much tighter into the hug to
still hit a 1.91:1 box, and the sliver of border reads as "this is a kept
photograph" rather than as an accidental edge in a link-preview thumbnail.

JPEG q92, 116KB.

## Superseded: the couple photo, with the link-icon watermark

Used briefly before the childhood polaroid replaced it. Supplied directly
at 1200×630 rather than cropped in-repo — `_source/
og-image-with-link-icon-original.png`. Carried a white chain-link badge
over the centre: the share-link icon a macOS app (Preview/Photos/Messages)
stamps onto an image when generating a shareable link, present because it
made it into the file that was supplied at the time. Flagged before
installing it as a likely accidental artifact; confirmed it should ship
as-is regardless. JPEG q92, 112KB, converted from a fully-opaque-alpha PNG.

## Superseded: the plain couple-photo crop (no icon)

The very first version of this file was cropped in-repo from the Closing
photo rather than supplied ready-made — kept here in case a couple-photo
OG image is wanted again:

`couple-original.png` is portrait (818×1280) and sideways in the frame, per
Closing's own README section above. A share-preview image can't be either of
those — every platform crops portrait OG images unpredictably, and nobody
should open a wedding link to see two sideways faces. So that crop was
rotated upright and cropped to the universal OG size (1200×630, 1.91:1):

```python
Image.open('_source/couple-original.png').convert('RGB') \
     .rotate(-90, expand=True)                              # → 1280×818, upright
     .crop((40, 0, 1240, 630))                               # center width, top-align height
```

Top-aligned rather than centred: both faces sit in the upper two-thirds of
the upright photo, so a top crop keeps them whole and only trims the lower
strip of clothing and the ring hand — cropping from the centre would have
cut into a forehead instead.

---

# Mohamed & Sohila's closing photo (`mohamed-tamer` branch only)

| File | Origin |
|---|---|
| `couple.jpg` | Supplied for this branch — a polaroid-style photo of the two of you |
| `_source/couple-mohamed-original.png` | As supplied, 1024×1024, before encoding |

This overwrites `couple.jpg`, the same filename Mazen & Shams's photo used
on `master`, so no code change was needed to swap it in — same pattern as
every other asset swap in this project. The two files are unrelated;
`master` keeps its own `couple.jpg` since branches don't share a working
tree.

Shipped whole, no crop: the photo already arrived at a clean square with
its white polaroid-style border, and cropping the border off would have
meant cutting into the border rather than the border being separate from
the subjects — there was no clean line between "border" and "photo" to cut
along that wouldn't also trim the kids. Re-encoded straight to JPEG q90
(RGB, no transparency to preserve): 1024×1024, 89KB.

`.closing__figure`'s `max-width` was moved from 818px (the old portrait
photo's own width) to 1024px (this one's), and the `<img>`'s
`width`/`height` attributes updated to match — same "never enlarge past
native size" rule as before, just against a different native size.

## Absolute URL, confirmed live

`og:image`, `twitter:image`, and `og:url` in `index.html` point at
`https://solinvitations.com/…` — required, not stylistic, since
WhatsApp/iMessage/Facebook fetch the image server-side with no page context
to resolve a relative path against. Confirmed serving correctly straight
from GitHub Pages (bypassing DNS, hit its IP directly with the right Host
header): `200`, `image/jpeg`, exactly 1200×630. Public testing is still
blocked on a Hostinger parking page intercepting the domain itself — see
`PLAN.md` Phase 16.

---

# Mohamed & Sohila's link preview (`mohamed-tamer` branch only)

| File | Origin |
|---|---|
| `og-image.jpg` | Supplied for this branch, already 1200×630 |
| `_source/og-image-mohamed-with-link-icon-original.png` | As supplied, before encoding |

Overwrites `og-image.jpg`, same filename Mazen & Shams's link preview uses
on `master` — no code change needed. Supplied ready-cropped at exactly
1200×630 with a link-share icon already baked over the centre (the same
kind of macOS share-link watermark seen on `master`'s own OG image);
installed as-is, per request, no cropping or icon removal. Re-encoded
straight to JPEG q92 (RGB, no transparency to preserve): 87KB.

`og:url`, `og:image`, and `twitter:image` in `index.html` point at
`https://nour1029.github.io/mohamed-sohila-invitation/…` — this branch's
own deployment (see the top-level project notes), not solinvitations.com.

---

# The ayah (`mohamed-tamer` branch only)

| File | Origin |
|---|---|
| `ayah.png` | Extracted from a supplied calligraphy image, 512×92 |
| `_source/ayah-original.png` | As supplied |

Surah Ar-Rum 30:21 (excerpt) — "وَجَعَلَ بَيْنَكُم مَّوَدَّةً وَرَحْمَةً",
"...and He placed between you affection and mercy..." — the verse almost
every Arabic wedding invitation opens with. Replaces the reference's own
English "Two Souls / One destiny / A Lifetime written by Allah" lines in
the Bismillah card, which are dropped entirely along with the rest of the
English in that section (per request — this card is Arabic-only now).

The supplied image wasn't a transparent cutout — it was a calligraphy
photo on an opaque near-white ground (`~rgb(240,236,231)`, flat with
mild JPEG noise, no texture to preserve). Same ink-over-paper
un-compositing as `venue-building.png` (see "Extracting the art" above),
solving `C = A·F + (1−A)·B` per pixel for a sampled paper colour, then
cropped to the ink's own opaque bounds (512×92 → 448×76) and quantised to
64 colours (27KB → 6.6KB). Sits on the card transparently, same as
`bismillah.png`, at 42% of the card's width — a little narrower than the
basmalah's 49%, since this is one short line rather than a full phrase.
