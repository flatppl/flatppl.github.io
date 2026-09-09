# flatppl.github.io

The [FlatPPL](https://flatppl.org/) landing page, built from Markdown with Bun
and TypeScript and served by GitHub Pages.

## Local preview

Using the Bun version in `.bun-version`:

```sh
bun install --frozen-lockfile
bun test
bun run build
bun run check
bun run dev
```

The development server prints its local URL. Production output is written to
`build/` only after every source and theme check succeeds.

## Shared theme

The site shell comes from the shared
[`flatppl-theme`](https://github.com/flatppl/flatppl-theme) bundle, which is
fetched into `vendor/flatppl-theme/` at build time rather than committed. `bun
run fetch-theme` — which `build`, `verify-theme`, `check`, `test` and `dev` run
first — downloads the release pinned in `src/fetch-theme.ts` and checks every
file against the manifest that release ships with, keeping the download until
the pin changes.

A `flatppl-theme` checkout next to this repository is used in preference to the
release, so theme edits show up in the next build. Such a copy carries no
manifest and each build reports it as `UNVERIFIED`. Three variables steer this:

- `FLATPPL_THEME_DIR` — copy from this checkout instead of the sibling one.
- `FLATPPL_THEME_REF` — download this release tag instead of the pinned one.
- `FLATPPL_THEME_NO_SIBLING=1` — ignore checkouts and take the release.

## Funding

This work was supported by Germany's Federal Ministry of Research, Technology
and Space (BMFTR) within the ErUM-Data programme under grant FKZ 05D25PC1
(DEMOS consortium).

## License

CC BY 4.0, see `LICENSE`. FlatPPL code examples in the site content are
licensed under the MIT License.
