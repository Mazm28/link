# Vazirmatn — self-hosted webfont

**Status: the font binaries are NOT in this repository yet. Three files must be placed here before the app renders correctly.**

```
public/fonts/Vazirmatn-Regular.woff2    (weight 400)
public/fonts/Vazirmatn-Medium.woff2     (weight 500)
public/fonts/Vazirmatn-Bold.woff2       (weight 700)
```

The `@font-face` declarations in [`src/styles/global.css`](../../src/styles/global.css) and the
`<link rel="preload">` tags in [`index.html`](../../index.html) already reference exactly these
three paths. Dropping the files in makes them live; no code change is needed.

## Where to get them

Vazirmatn is released under the SIL Open Font License 1.1 by Saber Rastikerdar:
<https://github.com/rastikerdar/vazirmatn> — take the `woff2` build from a tagged release.

Files were not downloaded automatically because fetching and committing third-party binaries is a
decision for a maintainer to make deliberately, not a side effect of code generation. Check the
licence file into the repository alongside them.

## Why self-hosted at all (NFR-L5, US-90)

Google Fonts and most public CDNs are unreliable or blocked from Iran. A font request that hangs
or fails leaves every screen in a fallback face — which for Persian is not a cosmetic downgrade:
letter joining, line height, and digit shapes all change, and the layout is tuned for Vazirmatn's
metrics.

For the same reason there is deliberately **no** `preconnect` to any font CDN in `index.html`, and
the Content-Security-Policy in the deployment headers does not allowlist one.

## Subsetting

The full Vazirmatn covers Arabic, Persian, and Latin. If the initial payload needs trimming against
the NFR-P3 budget (250 KB gzipped for the initial JS bundle; fonts are counted separately but still
sit on the critical path for first contentful paint, NFR-P1), subset to Persian + Latin + Persian
digits with `pyftsubset`:

```sh
pyftsubset Vazirmatn-Regular.ttf \
  --unicodes="U+0600-06FF,U+200C-200D,U+FB8A,U+067E,U+0686,U+06AF,U+06CC,U+0000-00FF" \
  --layout-features="*" --flavor=woff2 --output-file=Vazirmatn-Regular.woff2
```

Keep `U+200C` (ZWNJ) in any subset. It is a real, meaningful character in Persian — «می‌رود»
without it is a different word — and dropping it from the subset would render half-spaces as
tofu boxes across the entire app.
