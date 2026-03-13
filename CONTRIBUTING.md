# Contributing to WireText

Thanks for your interest in contributing.

## Getting started

```bash
git clone https://github.com/wiretext/wiretext
cd wiretext
npm install
npm test
```

Requires Node.js 20+.

## Development workflow

1. Fork the repository and create a branch from `master`.
2. Make your changes. Add or update tests for any new behavior.
3. Run `npm test` and `npm run build` to make sure everything passes.
4. Open a pull request against `master` with a clear description of what
   changed and why.

## Project structure

- `src/` -- TypeScript source (parser, body DSL, renderer, layout,
  themes, interactions)
- `test/` -- Vitest test suite
- `PROJECT.md` -- The authoritative language specification
- `skill/SKILL.md` -- Claude Code skill for generating WireText

## Code style

- 2-space indentation
- TypeScript strict mode
- Run `npm run typecheck` before submitting

## Reporting issues

Open an issue on GitHub with a minimal WireText snippet that reproduces
the problem and the expected vs actual output.

## License

By contributing you agree that your contributions will be licensed under
the MIT License.
