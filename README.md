# flatppl.github.io

The [FlatPPL](https://flatppl.org/) landing page: a single-page site built with
[Hugo](https://gohugo.io/) and the [Hextra](https://github.com/imfing/hextra)
theme, served by GitHub Pages.

The page content is in `content/_index.md`, and the site settings are in
`hugo.yaml`. The theme is a git submodule under `themes/hextra`, pinned to a release tag, so
clone with `--recurse-submodules` or run `git submodule update --init` after
cloning.

## Local preview

With Hugo (extended edition) on your `PATH`:

```sh
hugo server        # live-reloading preview at http://localhost:1313/
hugo --minify      # production build into public/
```

## Deployment

The `pages.yml` workflow builds the site on every push and pull request and
deploys it on pushes to `main`. Repository settings that are not in this
repository:

- Pages source: GitHub Actions.
- Custom domain: `flatppl.org`, with HTTPS enforced. `www.flatppl.org`
  redirects to it automatically once its DNS record exists.

The DNS zone for `flatppl.org` also carries the spec and playground sites,
which are served from their own repositories:

| Name   | Type  | Value             | Repository       |
|--------|-------|-------------------|------------------|
| `@`    | A     | GitHub Pages IPs  | this repository  |
| `@`    | AAAA  | GitHub Pages IPs  | this repository  |
| `www`  | CNAME | `flatppl.github.io` | this repository |
| `spec` | CNAME | `flatppl.github.io` | flatppl-design  |
| `live` | CNAME | `flatppl.github.io` | flatppl-js      |

The GitHub Pages IP addresses are listed in the
[GitHub Pages documentation](https://docs.github.com/en/pages/configuring-a-custom-domain-for-your-github-pages-site/managing-a-custom-domain-for-your-github-pages-site).
Verify `flatppl.org` at the organisation level before assigning the
subdomains, so that unclaimed subdomains cannot be taken over.

## License

CC BY 4.0, see `LICENSE`. FlatPPL code examples in the site content are
licensed under the MIT License. The Hextra theme under `themes/` is a separate
work under its own MIT license.
