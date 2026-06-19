# Graph Report - .  (2026-06-19)

## Corpus Check
- Corpus is ~17,546 words - fits in a single context window. You may not need a graph.

## Summary
- 87 nodes · 74 edges · 22 communities (12 shown, 10 thin omitted)
- Extraction: 100% EXTRACTED · 0% INFERRED · 0% AMBIGUOUS
- Token cost: 0 input · 0 output

## Community Hubs (Navigation)
- [[_COMMUNITY_Dev Dependencies Config|Dev Dependencies Config]]
- [[_COMMUNITY_Budget Detail Page|Budget Detail Page]]
- [[_COMMUNITY_Budget List Page|Budget List Page]]
- [[_COMMUNITY_Work Order Detail Page|Work Order Detail Page]]
- [[_COMMUNITY_Payroll Module|Payroll Module]]
- [[_COMMUNITY_Runtime Dependencies|Runtime Dependencies]]
- [[_COMMUNITY_Build Scripts|Build Scripts]]
- [[_COMMUNITY_Price Catalog|Price Catalog]]
- [[_COMMUNITY_Inventory Module|Inventory Module]]
- [[_COMMUNITY_TypeScript Path Config|TypeScript Path Config]]
- [[_COMMUNITY_Work Orders List|Work Orders List]]
- [[_COMMUNITY_Proxy RBAC Security|Proxy RBAC Security]]
- [[_COMMUNITY_App Layout Navigation|App Layout Navigation]]
- [[_COMMUNITY_Main Dashboard|Main Dashboard]]
- [[_COMMUNITY_Supabase Auth Client|Supabase Auth Client]]
- [[_COMMUNITY_ESLint Config|ESLint Config]]
- [[_COMMUNITY_Next.js Config|Next.js Config]]
- [[_COMMUNITY_PostCSS Config|PostCSS Config]]

## God Nodes (most connected - your core abstractions)
1. `scripts` - 5 edges
2. `FichaObra()` - 3 edges
3. `EditarPresupuesto()` - 3 edges
4. `Presupuestos()` - 3 edges
5. `compilerOptions` - 2 edges
6. `paths` - 2 edges
7. `formatFecha()` - 2 edges
8. `Nomina()` - 2 edges
9. `colorEstado()` - 2 edges
10. `formatFecha()` - 2 edges

## Surprising Connections (you probably didn't know these)
- None detected - all connections are within the same source files.

## Import Cycles
- None detected.

## Communities (22 total, 10 thin omitted)

### Community 0 - "Dev Dependencies Config"
Cohesion: 0.22
Nodes (8): devDependencies, eslint, eslint-config-next, tailwindcss, @tailwindcss/postcss, name, private, version

### Community 1 - "Budget Detail Page"
Cohesion: 0.38
Nodes (5): BADGE_COLOR, EditarPresupuesto(), ESTADOS, formatFecha(), formatPrecio()

### Community 2 - "Budget List Page"
Cohesion: 0.38
Nodes (5): BADGE_COLOR, ESTADOS, formatPrecio(), itemVacio(), Presupuestos()

### Community 3 - "Work Order Detail Page"
Cohesion: 0.47
Nodes (3): colorEstado(), FichaObra(), formatFecha()

### Community 4 - "Payroll Module"
Cohesion: 0.50
Nodes (3): formatFecha(), formVacio, Nomina()

### Community 5 - "Runtime Dependencies"
Cohesion: 0.40
Nodes (5): dependencies, next, react, react-dom, @supabase/supabase-js

### Community 6 - "Build Scripts"
Cohesion: 0.40
Nodes (5): scripts, build, dev, lint, start

### Community 9 - "TypeScript Path Config"
Cohesion: 0.50
Nodes (3): compilerOptions, paths, @/*

## Knowledge Gaps
- **36 isolated node(s):** `eslintConfig`, `@/*`, `nextConfig`, `name`, `version` (+31 more)
  These have ≤1 connection - possible missing edges or undocumented components.
- **10 thin communities (<3 nodes) omitted from report** — run `graphify query` to explore isolated nodes.

## Suggested Questions
_Questions this graph is uniquely positioned to answer:_

- **Why does `scripts` connect `Build Scripts` to `Dev Dependencies Config`?**
  _High betweenness centrality (0.017) - this node is a cross-community bridge._
- **Why does `dependencies` connect `Runtime Dependencies` to `Dev Dependencies Config`?**
  _High betweenness centrality (0.017) - this node is a cross-community bridge._
- **What connects `eslintConfig`, `@/*`, `nextConfig` to the rest of the system?**
  _36 weakly-connected nodes found - possible documentation gaps or missing edges._