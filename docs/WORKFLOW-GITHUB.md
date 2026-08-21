# Workflow — GitHub (Portuguese Estate pilot)

## Branches

- `main` — production (Cursor + Maxim only)
- `cc/portugal-audit-*` — Claude Phase 0 reports
- `cc/portugal-corpus-*` — corpus waves after ok
- `cc/portugal-content-*` — new articles after ok

## Claude

1. Branch from `main`
2. Reports in `.content-os/reports/`
3. Open PR — **do not merge**

## Cursor / Maxim

1. Review audit → «ок»
2. Merge corpus/code PRs one wave at a time
3. `npm run qa:full:quick` before each merge to main
4. Deploy + indexing only on explicit request

## Git identity (production)

Author/committer: `max-diver999 <maks.shchegolev@gmail.com>`
