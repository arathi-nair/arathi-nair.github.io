# Dev Notes

## General Guidelines

Prefer open source tools, platforms, and libraries over custom/bespoke implementations.

Follow GitHub best practices for git commands: use descriptive branch names (e.g. `feat/`, `fix/`, `chore/` prefixes), write clear commit messages, and follow PR best practices (small focused PRs, descriptive titles, summary of changes).

Follow coding best practices: use clear descriptive variable names, define constants instead of hardcoding values, and apply single responsibility principle (each function/module does one thing).

## Local Development

Serve the site locally:

```sh
bundle exec jekyll serve
```
