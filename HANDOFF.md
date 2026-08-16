# QPI site upgrade — sandbox pass

Branch: `upgrades`. Nothing has been pushed. Baseline commit is the repo exactly
as downloaded; one commit on top contains every change below.

---

## What changed

### New files

| File | Purpose |
|---|---|
| `assets/site.js` | Shared behaviour: mobile nav, contact form, analytics hook |
| `backend/apps-script/Code.gs` | Contact form backend — runs in QPI's Google Workspace |
| `backend/apps-script/SETUP.md` | Deploy instructions for the above |
| `services/cctv-pipeline-inspection.html` | Service page (~620 words of body copy) |
| `services/smoke-and-dye-testing.html` | Service page (~580 words) |
| `services/hydro-jetting.html` | Service page (~500 words) |
| `services/post-construction-validation.html` | Service page (~560 words) |
| `HANDOFF.md` | This file |

### Changed files

| File | Change |
|---|---|
| `index.html` | Rewritten head, sticky phone CTA, native contact form, trust block, sentence-case copy, hero fixes |
| `src/styles.css` | Absorbed the old inline `<style>` block plus new form and prose styles |
| `dist/styles.css` | Rebuilt (`npm run build:css`) — 14.7 KB → 19.2 KB |
| `sitemap.xml` | Added the four service pages, bumped `lastmod` |

`robots.txt` needed no change. It already exists and is correct — as does
`sitemap.xml`; the review flagged both as unverified.

---

## The review items, one by one

**1. Google Form → native form.** The iframe is gone. The contact section now
has a native, dark-themed form with labels, client-side validation, inline error
messages, `aria-live` status announcements, and a honeypot field. No nested
scrollbar, no white card, works at 375px.

*It is not yet delivering mail.* See "Before you go live" below.

**2. Phone number visibility.** `tel:+19013000626` now appears in the fixed
header at every scroll position — as a full button on desktop, as a compact
"Call" button on mobile beside the menu toggle. Also in the hero as the primary
CTA, in the contact section, in the footer, and at the bottom of each service
page. The `mailto:` nav CTA is gone; email is still offered as a secondary
option where it makes sense.

**3. Geography consistency.** Everything now says **West Tennessee & North
Mississippi** — title, meta description, OG/Twitter tags, hero, and schema. The
county list appears only in the footer. Schema `areaServed` was cut from ~50
loosely-related counties (it included Middle Tennessee and Delta Mississippi
counties that are not in the footer list) down to Memphis, Millington, and the
two regions.

**4. Title and meta.**

- Title: 82 → **53 chars**, `CCTV Pipeline & Sewer Inspection | West TN & North MS`
- Description: ~200 → **154 chars**, lowercase "specialized" typo fixed
- Every service page title is ≤ 58 chars and every description ≤ 150 chars
  (asserted in the generator, so they can't silently regress)

**5. Service pages.** Four pages, each with an at-a-glance spec box, structured
`Service` + `BreadcrumbList` JSON-LD, breadcrumb nav, a call/quote CTA, and
cross-links to the other three. Site word count went from ~1,500 characters to
roughly 3,400 words.

The copy is written from industry knowledge — PACP/NASSCO practice, standard
I&I methodology, standard jetting practice. **Read it and correct anything that
does not match how QPI actually works.** Anything I could not know is marked
TODO rather than invented.

**6. Trust block.** New `#trust` section: a four-tile stat row, a credentials
list, a slot for the sample deliverable, and a client-types paragraph. The
structure is built; the numbers are placeholders (`XX`, `$X M`). It is
deliberately obvious that they're unfilled — an invented trust block is worse
than none.

**7. Imagery.** Left in place with a comment marking the problem. The focus-van
render reads "TRENCHLESS PIPE REPAIR," a service that appears nowhere on the
site. Real photos of the rig, crew, and monitors are the fix and I can't produce
those.

**8. All-caps body copy.** Body font is now Barlow, sentence case. Archivo Black
uppercase is reserved for headings and short UI labels where it works.

**9. Hero image.** Added `object-position: 60% center` on mobile so the van
stays in frame instead of cropping to asphalt, and reduced the crop pressure
with a revised overlay gradient. **This does not fix the root cause** — the
source is 1600×873 and a tall mobile viewport still upscales it. Re-export at
1600×1600 or taller and it's genuinely solved.

**10. Analytics.** Skipped per your choice. The plumbing is in: `site.js`
already fires `phone_click` (with a `data-tel-location` label identifying which
link) and `form_submit` events, and detects either `gtag` or `plausible`
automatically. Drop a snippet in the `ANALYTICS SLOT` comment in each page's
`<head>` and events start flowing with no other change.

**11. Above-the-fold clarity.** "CCTV pipeline & sewer inspection" now sits
directly under the headline in display type, before any scroll, at every
viewport.

---

## Before you go live

### Required

1. **Deploy the form backend.** Follow `backend/apps-script/SETUP.md` — about 15
   minutes, done once. It runs in your own Google Workspace: no third-party form
   service, free auto-reply, free Sheets lead log, and mail sent from your own
   authenticated domain. The only website change afterward is pasting the
   `/exec` URL into `FORM_ENDPOINT` in `assets/site.js`.

   Until you do, the form falls back to opening the visitor's mail client with
   the message pre-filled. That is a safety net so the form is never a dead end
   — it is *not* a substitute for a real endpoint, since a large share of
   visitors have no configured mail client. This is the same problem the review
   flagged about the old `mailto:` CTA.

   One thing in that setup genuinely matters and looks wrong: the deployment
   must be **"Who has access: Anyone."** Any other value breaks the form for
   every visitor who isn't signed in to Google. SETUP.md explains why that is
   safe.

2. **Fill or delete every TODO.** Run `grep -rn TODO index.html services/ assets/`
   to list them. The trust-block placeholders (`XX` years, `$X M` coverage,
   license and insurance lines) will look worse than having no trust block if
   they ship as-is.

3. **Read the service page copy.** Correct any claim that doesn't match your
   actual equipment, process, or commitments.

### Recommended, in order of payoff

4. Redacted sample PACP report at `/assets/qpi-sample-report.pdf`, then activate
   the button in the trust block. This is the single highest-conversion asset
   available to you — your buyers are purchasing a document.
5. Real photos replacing the AI renders.
6. Re-export the hero at 1600×1600 or larger.
7. Analytics.
8. Google Business Profile. Still outweighs almost everything on this list for
   local service search.

---

## Testing performed

Rendered in headless Chromium at 375 / 768 / 1440 px across all five pages:

- No JavaScript errors, no page errors
- No horizontal overflow at any width
- All internal links and anchors resolve (checked programmatically)
- All JSON-LD blocks parse as valid JSON
- Title ≤ 60 chars and description ≤ 155 chars on every page
- Mobile menu opens, closes on link click, closes on Escape, `aria-expanded` tracks state
- Form validation: empty submit blocks and reports; invalid email caught; short phone caught

Contact form, browser side, against a mocked endpoint (4 scenarios):

- Success → confirmation shown, form resets, button re-enables
- Server rejection (HTTP 200 with `success: false`) → error shown, form does *not* reset
- Blocked/failed request → honest "sent but unconfirmed" message rather than a false failure
- No endpoint configured → mailto fallback, endpoint never called
- Payload asserted to be `application/x-www-form-urlencoded`, not multipart — this
  is load-bearing (see the comment in `site.js`) and is now covered by a test so
  it can't silently regress

Apps Script backend logic, run in Node with the Google globals stubbed (9 scenarios):

- Happy path: sheet row written, both emails sent, Reply-To set to the submitter, auto-reply personalised
- Honeypot → silent accept, nothing logged or emailed
- Bad token → rejected
- Missing required fields → rejected, message names the fields
- Invalid email → rejected
- Spreadsheet failure → lead email still sends, and warns that the row was lost
- Auto-reply failure → submission still succeeds
- Empty POST → rejected
- Health check returns live

What that testing does **not** cover: the real deployed script. The stubs verify
branching logic, not that Google's runtime behaves as expected. `runSelfTest()`
in the Apps Script editor is the real check — step 3 of SETUP.md, before the
website is ever pointed at it.

The only console errors were `fonts.googleapis.com` failing — the sandbox blocks
that host. Screenshots therefore render in a fallback sans-serif. Layout and
spacing are accurate; the actual type will be heavier and tighter.

**Not tested, and worth your five minutes:** a real phone. Load it on your own
device before pushing.

---

## Notes for future edits

The nav and footer are duplicated across all five pages — no templating, since
this is a plain static GitHub Pages deploy. **If you change one, change all
five.** `grep -l 'Main navigation' *.html services/*.html` finds them.

All asset paths are root-relative (`/assets/...`, `/dist/...`). That works
because the site is served at a domain apex via `CNAME`. If it ever moves to a
subpath, those need to become relative.

After any HTML edit, run `npm run build:css` — Tailwind only emits classes it
finds in the files it scans, so new utility classes won't exist in
`dist/styles.css` until you rebuild.
