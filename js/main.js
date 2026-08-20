/* ============================================================
   The Sacred Garden — wedding invitation
   Phase 0: the WEDDING config and the binding that renders it.

   EVERY wedding detail lives in the WEDDING object below and
   nowhere else. The reference site's countdown and its printed
   date disagreed by three months because they were two separate
   settings; here they are one value read twice.
   ============================================================ */

'use strict';

/* ---------- 1 · Config -------------------------------------
   PLACEHOLDER CONTENT — replaced wholesale in Phase 13.

   What lives here: anything the code reasons about, or anything
   printed in more than one place — names, the date, the venue,
   the schedule. What lives in index.html instead: one-off prose
   (the invitation paragraph, the dress code, the gift note).
   Keeping a sentence in both files is how it drifts.
   ----------------------------------------------------------- */

const WEDDING = {

  couple: {
    // Order matters: `one` reads first in the hero stack.
    one: 'Mohamed',
    two: 'Sohila',
    // Wax seal monogram (Phase 1 / Phase 2). NOTE: the envelope's still and
    // its opening film are photographed wax, not live text — they still
    // read "R&Z" and do not update from this value. See assets/img/README.md.
    monogram: 'M&S',
  },

  // ISO 8601 WITH offset. The offset is not optional — without it the
  // countdown silently shifts by the guest's own timezone.
  // 10 Sep 2026, 8:00 PM, Africa/Cairo — day 10, month 9 (corrected from an
  // earlier day/month mix-up). Egypt observes DST (EEST, +03:00) through
  // late October, so +03:00 is correct for this date — verified against
  // the IANA tz database (zoneinfo), not assumed.
  datetime: '2026-09-10T20:00:00+03:00',

  // The wedding's own timezone. Everything printed on the page is rendered
  // in *this* zone, so a guest reading from Sydney still sees the date and
  // time the wedding actually happens at, not their local translation.
  timezone: 'Africa/Cairo',

  // How the date is printed in the hero. Mirrors the reference's `27.09.26`.
  dateFormat: 'dotted',

  venue: {
    name: 'Romanica Hall',
    addressLines: ['El-Mokattam, New Mokattam', 'Corniche, Cairo, Egypt'],

    // Exact pin for the map embed and the Open in Maps link (Phase 8),
    // from the Google Maps link supplied for this venue.
    coords: { lat: 30.019312, lng: 31.320875 },
  },

  // Phase 11. Relative path into assets/audio/, e.g. 'assets/audio/music.mp3'.
  // The player, the button and the start-on-open handoff are all built and
  // verified; this is the only thing standing between them and working.
  // While it is empty the button never appears, so guests are never offered
  // a control that does nothing. See PLAN.md Phase 11 for what to drop in.
  audioSrc: 'assets/audio/music.mp3',

  gate: {
    // How long the envelope remembers it has been opened:
    //   'never'   — always gate. Every guest opens the envelope every time;
    //               it is the first impression and nobody should miss it.
    //   'session' — skipped for the rest of the browsing session
    //   'forever' — opened once, never gated again on this device
    remember: 'never',
  },
};

/* ---------- 2 · Derived values -----------------------------
   Nothing below is authored by hand; it all falls out of §1.
   ----------------------------------------------------------- */

const WEDDING_DATE = new Date(WEDDING.datetime);

const TZ = WEDDING.timezone;

/** Format `d` in the wedding's timezone, never the reader's. */
function inVenueZone(d, locale, options) {
  return new Intl.DateTimeFormat(locale, { timeZone: TZ, ...options }).format(d);
}

const fmt = {
  /** `27.09.26` */
  dotted(d) {
    return inVenueZone(d, 'en-GB', { day: '2-digit', month: '2-digit', year: '2-digit' })
      .replace(/\//g, '.');
  },

  /** `27 September 2026` */
  long(d) {
    return inVenueZone(d, 'en-GB', { day: 'numeric', month: 'long', year: 'numeric' });
  },

  /** `5:00 PM`, no leading zero. */
  time(d) {
    return inVenueZone(d, 'en-US', { hour: 'numeric', minute: '2-digit' });
  },
};

/**
 * Values addressable from markup as `data-wedding="key"`.
 * Add a key here rather than reaching into WEDDING from a section script.
 */
const WEDDING_TEXT = {
  'couple.one':      WEDDING.couple.one,
  'couple.two':      WEDDING.couple.two,
  'couple.both':     `${WEDDING.couple.one} and ${WEDDING.couple.two}`,
  'couple.monogram': WEDDING.couple.monogram,

  'date':      fmt[WEDDING.dateFormat](WEDDING_DATE),
  'date.long': fmt.long(WEDDING_DATE),
  'time':      fmt.time(WEDDING_DATE),

  'venue.name':    WEDDING.venue.name,
  'venue.address': WEDDING.venue.addressLines.join(', '),
};

/* ---------- 3 · Binding ------------------------------------
   <span data-wedding="venue.name"></span> gets filled on load.
   Text only — never HTML, so config content can't inject markup.
   ----------------------------------------------------------- */

function bindWeddingText(root = document) {
  root.querySelectorAll('[data-wedding]').forEach((el) => {
    const key = el.dataset.wedding;
    if (key in WEDDING_TEXT) {
      el.textContent = WEDDING_TEXT[key];
    } else {
      console.warn(`[wedding] unknown data-wedding key: "${key}"`);
    }
  });

  // <time> elements get a machine-readable datetime alongside the text.
  root.querySelectorAll('time[data-wedding]').forEach((el) => {
    el.dateTime = WEDDING.datetime;
  });
}

/* ---------- 4 · Shared helpers ------------------------------ */

const prefersReducedMotion = () =>
  window.matchMedia('(prefers-reduced-motion: reduce)').matches;

/** Storage that shrugs rather than throws — Safari private mode blocks it. */
const store = {
  get(key) {
    try {
      return sessionStorage.getItem(key) ?? localStorage.getItem(key);
    } catch { return null; }
  },
  set(key, value, scope) {
    try {
      (scope === 'forever' ? localStorage : sessionStorage).setItem(key, value);
    } catch { /* not worth bothering the guest about */ }
  },
};

/* ---------- 5 · Envelope gate (Phase 2) --------------------
   Still of the sealed envelope, then a short film of it opening
   that dissolves as it ends.

   Every branch here has to end with the guest inside. A video
   that will not load, will not decode, or silently stalls must
   never leave someone staring at a sealed envelope.
   ----------------------------------------------------------- */

const GATE_KEY  = 'wedding.gate.opened';
const FADE_MS   = 900;    /* .gate__still / .gate__film fade  */
const DISSOLVE_MS = 800;  /* .gate fade once the film is done */

function initGate() {
  const gate  = document.getElementById('gate');
  const video = document.getElementById('gate-video');
  const main  = document.getElementById('invitation');
  if (!gate) return;

  const wasOpened =
    WEDDING.gate.remember !== 'never' && store.get(GATE_KEY) === '1';

  if (wasOpened) {
    gate.hidden = true;
    return;                       // straight in, no lock, no film
  }

  lockScroll(true);
  if (main) main.inert = true;    // keep tab focus out of the page behind

  let opening = false;
  let finished = false;

  /** Let the guest in. Safe to call twice; only the first call counts. */
  const finish = () => {
    if (finished) return;
    finished = true;

    gate.classList.add('is-closing');
    gate.classList.add('is-open');
    lockScroll(false);
    if (main) main.inert = false;

    // The film is over and the page is the guest's. Phase 11 waits for this
    // to fade the music button in — the reference keeps it out of sight
    // until exactly here, rather than floating it over a sealed envelope.
    document.dispatchEvent(new CustomEvent('wedding:opened'));

    window.setTimeout(() => {
      gate.hidden = true;
      video?.pause();
      document.getElementById('hero')?.focus({ preventScroll: true });
    }, DISSOLVE_MS);
  };

  const open = () => {
    if (opening) return;
    opening = true;

    if (WEDDING.gate.remember !== 'never') {
      store.set(GATE_KEY, '1', WEDDING.gate.remember);
    }

    // Phase 11 listens for this: audio may only start from a real gesture.
    document.dispatchEvent(new CustomEvent('wedding:open'));

    // Stillness means no film either — fade straight through.
    if (prefersReducedMotion() || !video) {
      finish();
      return;
    }

    gate.classList.add('is-playing');

    // Begin the dissolve just before the last frame, so the film never
    // shows its final frozen frame or a flash of black.
    const watchForEnd = () => {
      if (!video.duration || Number.isNaN(video.duration)) return;
      const remaining = (video.duration - video.currentTime) * 1000;
      if (remaining <= FADE_MS) finish();
    };
    video.addEventListener('timeupdate', watchForEnd);
    video.addEventListener('ended', finish);

    // If it cannot play at all, do not strand the guest behind it.
    video.addEventListener('error', finish);
    video.addEventListener('stalled', finish);

    const played = video.play();
    if (played && played.catch) played.catch(finish);

    // Backstop: if the video never fires a single event — a decode failure
    // on an old phone, say — let them in on the clock instead.
    const cap = (video.duration && !Number.isNaN(video.duration))
      ? video.duration * 1000 + 1200
      : 7000;
    window.setTimeout(finish, cap);
  };

  gate.addEventListener('click', open);
  gate.addEventListener('keydown', (e) => {
    if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); open(); }
  });
}

function lockScroll(locked) {
  document.body.classList.toggle('is-gated', locked);
}

/* ---------- 6 · Scroll reveals (Phase 4) -------------------
   Fades elements up as they arrive, once each. Anything marked
   `data-reveal` moves on its own; `data-reveal-stagger` cascades
   its children.
   ----------------------------------------------------------- */

function initReveals() {
  const targets = document.querySelectorAll('[data-reveal], [data-reveal-stagger]');
  if (!targets.length) return;

  const revealNow = (el) => el.classList.add('is-revealed');

  // No observer, or the guest asked for stillness: show everything outright.
  if (prefersReducedMotion() || !('IntersectionObserver' in window)) {
    targets.forEach(revealNow);
    return;
  }

  // Number the children so CSS can space their delays out.
  document.querySelectorAll('[data-reveal-stagger]').forEach((group) => {
    [...group.children].forEach((child, i) => {
      child.style.setProperty('--reveal-i', i);
    });
  });

  const observer = new IntersectionObserver((entries, obs) => {
    entries.forEach((entry) => {
      if (!entry.isIntersecting) return;
      revealNow(entry.target);
      obs.unobserve(entry.target);      // fires once; scrolling back up is calm
    });
  }, {
    threshold: 0.12,
    // The huge top margin counts anything already scrolled past as arrived.
    // Without it, a guest who jumps down the page — a deep link, a fast
    // fling, a find-in-page — leaves every skipped section stranded at
    // opacity 0 permanently, because it never intersects on the way back.
    // The bottom margin holds a reveal off until the element is properly
    // in, rather than the instant its first pixel crosses the fold.
    rootMargin: '9999px 0px -8% 0px',
  });

  targets.forEach((el) => observer.observe(el));
}

/* ---------- 7 · Countdown (Phase 6) ------------------------
   Counts down to WEDDING_DATE — the same value the hero prints,
   so the two can never disagree the way the reference's did.
   ----------------------------------------------------------- */

const MS = { second: 1000, minute: 60000, hour: 3600000, day: 86400000 };

/**
 * A unit rolls out and back in on change, rather than the text just
 * jumping — mirrors the reference's own "flip" transition. 520ms matches
 * its .55s transform/opacity transition, so the swap lands mid-motion
 * instead of stalling on a held frame.
 */
function flipDigit(el, newValue) {
  if (el.textContent === newValue) return;
  el.classList.add('is-leaving');
  window.setTimeout(() => {
    el.classList.remove('is-leaving');
    el.classList.add('is-entering');
    el.textContent = newValue;
    void el.offsetHeight;               // force reflow so the next class removal animates
    el.classList.remove('is-entering');
  }, 520);
}

function initCountdown() {
  const clock = document.getElementById('countdown-clock');
  const after = document.getElementById('countdown-after');
  if (!clock) return;

  const fields = {};
  clock.querySelectorAll('[data-count]').forEach((el) => {
    fields[el.dataset.count] = el;
  });

  // The gold ink-wipe and shimmer only ever play once, the first time the
  // clock scrolls into view — same trigger the reference uses.
  const revealables = clock.querySelectorAll('.count__value, .count__label, .count__sep');
  const reveal = () => revealables.forEach((el) => el.classList.add('is-revealed'));

  if (prefersReducedMotion() || !('IntersectionObserver' in window)) {
    reveal();
  } else {
    const observer = new IntersectionObserver((entries, obs) => {
      if (entries.some((e) => e.isIntersecting)) {
        reveal();
        obs.disconnect();
      }
    }, { threshold: 0.5 });
    observer.observe(clock);
  }

  let timer = null;
  let first = true;

  const tick = () => {
    const remaining = WEDDING_DATE.getTime() - Date.now();

    if (remaining <= 0) {
      // The celebration is under way or done. Say something warm rather
      // than showing a clock stuck on zero.
      const sinceStart = -remaining;
      after.textContent = sinceStart < MS.day
        ? "Today's the day"
        : 'Thank you for celebrating with us';
      after.hidden = false;
      clock.hidden = true;
      if (timer) clearInterval(timer);
      return;
    }

    const pad = (n) => String(n).padStart(2, '0');
    const next = {
      days:    String(Math.floor(remaining / MS.day)),
      hours:   pad(Math.floor(remaining / MS.hour)   % 24),
      minutes: pad(Math.floor(remaining / MS.minute) % 60),
      seconds: pad(Math.floor(remaining / MS.second) % 60),
    };

    if (first) {
      // The opening render sets every digit directly — nothing is on
      // screen yet for a flip to be worth animating, and it would only
      // add motion behind the ink-wipe reveal.
      Object.entries(next).forEach(([unit, value]) => { fields[unit].textContent = value; });
      first = false;
    } else {
      Object.entries(next).forEach(([unit, value]) => flipDigit(fields[unit], value));
    }
  };

  tick();
  timer = window.setInterval(tick, MS.second);
}

/* ---------- 9 · Venue and map (Phase 8) --------------------
   The place lives only in WEDDING.venue; both the embed and the
   directions link are built from it here.

   `coords` pins the exact door when we have it. Until then we hand
   Google and Apple the address text and let them geocode — a wider
   pin, but on the right street rather than a made-up one, and it
   costs nothing to swap once the real numbers arrive.
   ----------------------------------------------------------- */

function initVenue() {
  const { coords, name, addressLines } = WEDDING.venue;
  const fullAddress = [name, ...addressLines].join(', ');

  // What the maps get: a lat,lng pair if we have one, the address if not.
  const query = coords ? `${coords.lat},${coords.lng}` : fullAddress;
  // Zooming to the doorstep only makes sense once the pin is the doorstep.
  const zoom = coords ? 16 : 13;

  // One line per configured address line, so the break lands where the
  // design puts it instead of wherever the column runs out. textContent
  // only — config text can no more inject markup here than anywhere else.
  const lines = document.querySelector('.venue__address-lines');
  if (lines) {
    lines.replaceChildren(...addressLines.map((line, i) => {
      const el = document.createElement('span');
      el.className = 'venue__address-line';
      // Commas join the lines back into one readable address; the last
      // line ends the sentence and takes none. The trailing space is
      // invisible at the end of a block but keeps a copied address from
      // coming out as "…October City,Giza Governorate".
      el.textContent = i < addressLines.length - 1 ? `${line}, ` : line;
      return el;
    }));
  }

  // Plain embed URL — no API key, no billing account to keep alive.
  const map = document.getElementById('venue-map');
  if (map) {
    map.src = `https://maps.google.com/maps?q=${encodeURIComponent(query)}&z=${zoom}&output=embed`;
    map.title = `Map showing ${name}`;
  }

  const link = document.getElementById('venue-directions');
  if (!link) return;

  // Apple Maps is the native handler on iOS and iPadOS; sending those guests
  // to a google.com URL bounces them through the browser or a store page.
  // iPadOS reports itself as a Mac, so touch support disambiguates.
  const ua = navigator.userAgent;
  const isApple = /iPad|iPhone|iPod/.test(ua) ||
                  (/Macintosh/.test(ua) && navigator.maxTouchPoints > 1);

  // Apple takes a label plus an optional pin; without `ll` it searches `q`.
  const appleLL = coords ? `&ll=${coords.lat},${coords.lng}` : '';

  link.href = isApple
    ? `https://maps.apple.com/?q=${encodeURIComponent(fullAddress)}${appleLL}`
    : `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(query)}`;

  link.target = '_blank';
  link.rel = 'noopener';
}

/* ---------- 10.5 · Hero scene video ------------------------
   The hero's painting is a video. It only starts once the guest
   is through the envelope, and it never becomes load-bearing:
   the poster is the still plate, so a browser that cannot decode
   the file simply shows the painting.
   ----------------------------------------------------------- */

function initHeroVideo() {
  const video = document.getElementById('hero-video');
  if (!video) return;

  // Stillness means stillness — leave the poster showing.
  if (prefersReducedMotion()) return;

  let started = false;
  const start = () => {
    if (started) return;
    started = true;
    video.preload = 'auto';
    video.load();
    const played = video.play();
    // A refusal or a codec the browser cannot handle is fine: the poster
    // is the same artwork, so there is nothing to fall back to or fix.
    if (played && played.catch) played.catch(() => {});
  };

  document.addEventListener('wedding:open', start, { once: true });

  // If the gate was skipped entirely, wedding:open never fires.
  if (document.getElementById('gate')?.hidden) start();
}

/* ---------- 11 · Music player (Phase 11) -------------------
   Starts when the envelope opens, because that is the one moment
   we are guaranteed a real user gesture — mobile browsers refuse
   audio without one.
   ----------------------------------------------------------- */

function initMusic() {
  const button = document.getElementById('music-toggle');
  const audio  = document.getElementById('music-audio');
  const label  = document.getElementById('music-label');
  if (!button || !audio) return;

  // ?music=off — for a guest who wants to open the invitation somewhere
  // sound would be unwelcome (a quiet room, at work) without it ever
  // trying to play or the button appearing to offer a control that isn't
  // there. Returning here leaves button.hidden at its markup default, so
  // nothing further in this function runs.
  if (new URLSearchParams(location.search).get('music') === 'off') return;

  // Nothing to play yet: leave the button hidden rather than offering a
  // control that does nothing.
  if (!WEDDING.audioSrc) return;

  audio.src = WEDDING.audioSrc;
  // The reference plays at full volume. One line to soften if it startles.
  audio.volume = 1;
  button.hidden = false;

  // Present in the DOM but invisible until the film ends, so the transition
  // has a box to animate. If the gate was skipped, show it straight away.
  const reveal = () => button.classList.add('is-ready');
  document.addEventListener('wedding:opened', reveal, { once: true });
  if (document.getElementById('gate')?.hidden) reveal();

  // The icon is driven by the audio element's own events, not by what we
  // asked it to do — so it always shows what is actually happening, even
  // if the browser or the phone's media controls overrule us.
  const sync = () => {
    const playing = !audio.paused;
    button.classList.toggle('is-playing', playing);
    button.setAttribute('aria-pressed', String(playing));
    label.textContent = playing ? 'Pause music' : 'Play music';
  };

  audio.addEventListener('play', sync);
  audio.addEventListener('pause', sync);
  audio.addEventListener('ended', sync);
  sync();

  button.addEventListener('click', () => {
    if (audio.paused) audio.play().catch(sync);
    else audio.pause();
  });

  // Fired by the envelope gate. If the browser still refuses, the button
  // simply stays in its paused state for the guest to press.
  document.addEventListener('wedding:open', () => {
    if (prefersReducedMotion()) return;   // stillness means sound too
    audio.play().catch(() => sync());
  }, { once: true });
}

/* ---------- 12 · Boot -------------------------------------- */

document.addEventListener('DOMContentLoaded', () => {
  bindWeddingText();
  initGate();
  initCountdown();
  initVenue();

  // Both register their wedding:open listeners before the gate can fire it.
  initMusic();
  initHeroVideo();

  initReveals();
});
