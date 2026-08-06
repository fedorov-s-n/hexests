# hexests — project rules and remembered decisions

This file is the project's memory. Anything worth remembering about this repository lives **here, in
the repository**, not in a per-machine memory store outside it. Everything is written in English.

## Everything that belongs to this project belongs in the repository

Every file that has anything to do with this project's code — sources, tests, configuration,
notes, agent instructions, skills (`.claude/skills`), task lists, run logs worth keeping — is kept
inside the repository and committed. Nothing about the project is left in a home-directory store, a
scratch folder or a session that will be forgotten.

## Panning with W, A, S, D, and the world moving as one

Moving the map with the `W`, `A`, `S` and `D` keys is a permanent, first-class feature of the app,
not a debugging aid. The whole world moves at once, and it always will.

## Committing

Commit on `master` itself: no feature branch, no merge step. It is a personal single-author
repository with no review flow, so a branch and a merge are pure overhead. Keep the repository's own
`user.name` and `user.email`; never pass `--author`.

## Getting the app in front of you

- build with `npx webpack`; copy the page with
  `npx copyfiles -u 2 "src/main/html/**" "src/main/css/**" target/`;
- it is served by the IDE at `http://localhost:63342/hexests/target/html/index.html` (a 404 on every
  path means IntelliJ is refusing unsigned requests — ask for the setting);
- `window.di` is the whole DI container, for the JavaScript console; see the `runtime-inspect` skill,
  which also holds the rule that a picture looking wrong is a hypothesis, not a diagnosis: read the
  arrays;
- `npx jest` runs the tests.

## Extra rules

- Never write a new rule without explicit confirmation of its explicit text