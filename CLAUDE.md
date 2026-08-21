# Portuguese Estate — Claude Code

**Site:** [portuguese-estate.com](https://portuguese-estate.com) · **126 MDX** · EN · Portugal property + tax/residency

## Start here

1. `more-group-content-os/CLAUDE-BOOTSTRAP.md`
2. `.content-os/STATUS.md` + `site-passport.yaml`
3. `more-group-content-os/programs/portuguese-estate.yaml`
4. `CLAUDE-CODE-START.md` — **paste Phase 0 prompt to begin audit**

## Submodule

```bash
git submodule update --init more-group-content-os
```

## You may

- Read full corpus, run validate/geo/build/audit locally
- Write audit reports under `.content-os/reports/`
- Commit on `cc/portugal-*` branches

## You may NOT

- Push to `main`, deploy, or run indexing API
- Mass-edit MDX or add slugs before Maxim says **«ок»** after Phase 0

## Indexing

Only `portuguese-estate-indexing` GCP project. See `portuguese-estate-indexing-isolation.mdc` in content-os policies.
