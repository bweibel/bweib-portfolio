# bweib.com — Portfolio Site Spec

Personal portfolio for **Ben** (Full-Stack Developer) at **bweib.com**.

## Strategy

The project is phased, prioritizing clean, high-quality code over visual flash
up front:

1. **Milestone 1 (current):** a usable, accessible foundation — About intro,
   online resume, and contact options.
2. **Later milestones:** layered visual design — three.js, scroll/entrance
   animations, and interactive bits — on top of the solid foundation.

## Tech Decisions

| Area        | Decision                                                              |
| ----------- | --------------------------------------------------------------------- |
| Framework   | Astro + TypeScript (static output; islands available for later JS)    |
| Hosting     | Hostinger — static `dist/` build, manual upload for now               |
| Styling     | Scoped component CSS + design tokens (CSS custom properties, no deps) |
| Resume data | JSON Resume file (jsonresume.org schema) at `src/data/resume.json`    |
| Contact     | Email link + GitHub + LinkedIn (no backend / form in M1)              |
| Accent      | Warm amber (`#f59e0b`), one token                                     |

Astro ships zero JS by default (fast static output for Hostinger) while
supporting framework "islands," so interactive features can be added later
without re-platforming.

## Architecture

Single page (`index.astro`) composed of sections, structured so they can split
into routes later.

```
src/
├── data/
│   ├── resume.json   # JSON Resume data (PLACEHOLDER until Ben's export is dropped in)
│   ├── resume.ts     # JSON Resume types + typed export (source of truth)
│   └── site.ts       # name/role/bio, contactEmail, socials, SEO meta
├── lib/
│   └── dates.ts      # JSON Resume date formatting helpers
├── styles/
│   ├── tokens.css    # design tokens (color/space/type/radii, dark scheme)
│   └── global.css    # modern reset + base element styles
├── layouts/
│   └── BaseLayout.astro   # <head> SEO/OG/Twitter, favicon, global styles
├── components/
│   ├── Header.astro       # sticky wordmark + anchor nav
│   ├── Hero.astro         # About intro (name/role/bio + CTA + socials)
│   ├── Resume.astro       # orchestrates experience / skills / education
│   ├── ExperienceItem.astro
│   ├── SkillList.astro
│   ├── SocialLinks.astro
│   ├── Contact.astro      # mailto: + socials
│   └── Footer.astro
└── pages/
    └── index.astro        # composes BaseLayout + sections
```

## Data model

The resume follows the **JSON Resume** schema. `resume.ts` defines TypeScript
interfaces for the subset we render and types the imported JSON:

- `basics` → name, `label` (role), `summary`, `email`, `profiles[]`.
- `work[]` → `name`, `position`, `startDate`/`endDate`, `location`, `highlights[]`.
- `education[]` → `institution`, `studyType`/`area`, dates.
- `skills[]` → `name` (group) + `keywords[]`.

`resume.json` is currently a schema-matching **placeholder**; dropping in the
real export requires no code changes.

`site.ts` holds what the resume doesn't (or what should differ on the public
site): display `name`/`role`, `bio`, public `contactEmail`, curated `socials`,
and SEO metadata. These take precedence for display.

## Design tokens

`tokens.css` is the single source of visual truth — semantic color names
(`--color-accent`, `--color-surface`, …), a spacing step scale, a fluid
`clamp()` type scale, radii, and a `prefers-color-scheme: dark` block. The later
visual milestone re-themes by editing tokens, not markup. `global.css` adds a
small reset, base element styles, a visible focus ring, and a
`prefers-reduced-motion` guard.

## Commands

| Command                | Purpose                                              |
| ---------------------- | ---------------------------------------------------- |
| `npm run dev`          | Local dev server                                     |
| `npm run build`        | Type-check (`astro check`) + static build to `dist/` |
| `npm run preview`      | Serve the built `dist/` locally                      |
| `npm run format`       | Format with Prettier                                 |
| `npm run format:check` | Verify formatting                                    |

## Deployment

Static output. Run `npm run build`, then upload the contents of `dist/` to the
Hostinger public web root (File Manager or FTP). No server runtime required.
Automating this is deferred (see Roadmap).

## Verification checklist

- `npm run build` succeeds (includes `astro check`, 0 errors).
- `npm run format:check` clean.
- `npm run preview` serves the page (HTTP 200); nav anchors jump to
  About/Resume/Contact; `mailto:` and social links work (socials open in a new
  tab with `rel="noopener noreferrer"`).
- Responsive at ~360 / ~768 / ~1200 px.
- Accessibility: keyboard tab order, visible focus states, heading hierarchy,
  color contrast. Target Lighthouse ≥ 95 across categories.

## Open items

- **Real `resume.json`** — replace the placeholder with Ben's JSON Resume export.
- **Bio** — replace the placeholder paragraph in `site.ts`.
- **Tagline** — optional one-liner (currently omitted).

## Roadmap (not built in M1)

- **M2 — Visual identity & motion:** refined type/layout, entrance & scroll
  animations (Astro islands or View Transitions), dark/light polish.
- **M3 — three.js / interactive:** WebGL hero/background and interactive bits as
  isolated, lazy-loaded islands.
- **Infra:** automated deploy (Hostinger Git or FTP script), optional contact
  form (serverless/Formspree), downloadable PDF resume generated from
  `resume.json`.
