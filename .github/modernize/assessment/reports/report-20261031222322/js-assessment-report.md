# Project assessment

- Project: `carrito-compras`
- Type: Next.js / React JavaScript application
- Scope: source review, dependency update check, build, lint, and npm audit
- Dependency update check: `npm-check-updates@19.6.3`

## Results

- `npm run lint`: passed.
- `npm run build`: passed; `/` is statically prerendered.
- `npm audit --omit=dev`: 0 vulnerabilities.
- `npm audit`: 16 moderate advisories in the development dependency tree. The common affected package is `minimatch` (`<11.0.1`), with a potential denial of service through globparts amplification (GHSA-g3hv-75wg-m249). npm's suggested forced fix downgrades ESLint to 4, so do not apply it blindly.
- Available updates: React and React DOM `19.3.0` → `19.3.1` (patch); ESLint `^9` → `^10` (major, review compatibility before upgrading).
- No test script or test files were present in the repository.

## Findings

1. **Moderate — development dependency advisory.** The dependency audit reports a transitive `minimatch` vulnerability through the ESLint toolchain. It is not in the production dependency tree according to `npm audit --omit=dev`. Review compatible ESLint/Next dependency updates and re-run the audit; avoid `npm audit fix --force` because its proposed ESLint version is a breaking downgrade.
2. **Resolved — document language.** [src/app/layout.js](../../../../../src/app/layout.js) now declares `lang="es-PE"` to match the Spanish storefront.
3. **Resolved — accessible control names.** The search input and cart quantity buttons in [src/app/page.js](../../../../../src/app/page.js) now have descriptive accessible names.
4. **Implemented — frontend cart experience.** The cart is persisted in browser `localStorage`, adding products shows a temporary confirmation, and checkout opens an accessible on-screen summary. Checkout remains a demonstration and does not create an order.

## Scope note

The storefront is a client-side demonstration: cart state persists in the current browser, but there is no server-side order, inventory, or payment processing.
