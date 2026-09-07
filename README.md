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
`build/` only after every source and vendored-theme check succeeds.

## Shared theme

The exact `flatppl-theme` v0.1.2 release bundle is committed under
`vendor/flatppl-theme/`. `bun run verify-theme` checks its pinned release,
source commit, manifest digest, file sizes, and SHA-256 hashes.

## Funding

This work was supported by Germany's Federal Ministry of Research, Technology
and Space (BMFTR) within the ErUM-Data programme under grant FKZ 05D25PC1
(DEMOS consortium).

## License

CC BY 4.0, see `LICENSE`. FlatPPL code examples in the site content are
licensed under the MIT License.
