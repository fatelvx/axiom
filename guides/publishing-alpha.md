# Publishing The Public Alpha

Axiom's npm package target is:

```text
@fatelvx/axiom
```

The unscoped `axiom` package name is already used by another package, so the first public alpha uses a scoped package.

## Preflight

Run the full alpha check:

```bash
npm run alpha:check
```

This runs:

- the test suite
- Axiom's self-contract check
- spec-first, MCP, GitHub Actions, and release-candidate smokes
- an npm pack dry run

The release-candidate smoke packs the local package without publishing, extracts it, and verifies the packaged CLI, Vue SFC scanning, monorepo path coverage, inference JSON, bin aliases, and MCP entry point.

## Verify The Package Locally

Create a tarball:

```bash
npm pack
```

Then install it in a temporary project and verify both bins:

```bash
npm install -D ./fatelvx-axiom-<version>.tgz
npx axi --help
npx axiom --help
```

## Publish

Only publish after the repository CI is green:

```bash
npm login
npm publish --access public --tag alpha
```

After publishing, users should be able to run:

```bash
npm install -D @fatelvx/axiom
npx axi check --root .
npx @fatelvx/axiom check --root .
```

## Post-Publish

Update README install wording if it still says the package is not published yet.

Then create a GitHub release for the published version.
