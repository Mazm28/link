# Vazirmatn — self-hosted webfont

**Status: ✅ present.** Added 2026-08-08 under CR-05, on an explicit maintainer decision.

```
public/fonts/Vazirmatn-Regular.woff2    (weight 400)   50,684 bytes
public/fonts/Vazirmatn-Medium.woff2     (weight 500)   51,128 bytes
public/fonts/Vazirmatn-Bold.woff2       (weight 700)   51,020 bytes
public/fonts/OFL.txt                    (licence)
```

The `@font-face` declarations in [`src/styles/global.css`](../../src/styles/global.css) and the
`<link rel="preload">` tags in [`index.html`](../../index.html) reference exactly these paths.

## Provenance

| | |
|---|---|
| Project | Vazirmatn by Saber Rastikerdar — <https://github.com/rastikerdar/vazirmatn> |
| Release | **v33.003** (the font build reports version 33.197) |
| Archive | `vazirmatn-v33.003.zip`, 13,047,191 bytes |
| SHA-256 | `0a9afd41967e6f57096a56a181a23f81a2b999b62f1f2a4e4b26736580854fdb` |
| Licence | SIL Open Font License 1.1 — `OFL.txt`, checked in alongside |
| Taken from | `fonts/webfonts/` in the archive; every other file discarded |

Three weights out of the ten published, because `global.css` declares three. Shipping the variable
`Vazirmatn[wght].woff2` (111 KB) instead would cost more than all three static weights together,
for weights nothing asks for.

**These are the FULL faces, not subset.** Subsetting is documented below and is available if the
payload ever needs trimming, but unsubset is the safe default: no glyph in the app can render as a
tofu box because it was cut out.

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
