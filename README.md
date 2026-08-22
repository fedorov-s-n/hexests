# hexests

Procedural hex-tile world generation (lithospheric plates, height, water,
hardness) rendered with three.js, built with TypeScript + React + webpack.

## Live playground

The `master` branch is published automatically to GitHub Pages:

**▶️ https://fedorov-s-n.github.io/hexests/html/**

This page is always available (it tracks `master`); open pull requests get their
own preview under `pr-preview/pr-<N>/html/`.

## Build & test

```bash
npm ci      # cleans target/, runs webpack, copies HTML/CSS into target/
npm test    # jest
```

The static result is served from `target/`; the entry page is
`target/html/index.html`.
