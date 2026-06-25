# Graph Report - C:\Users\HP\cq-climatizacion  (2026-06-22)

## Corpus Check
- cluster-only mode — file stats not available

## Summary
- 106 nodes · 95 edges · 22 communities (12 shown, 10 thin omitted)
- Extraction: 100% EXTRACTED · 0% INFERRED · 0% AMBIGUOUS
- Token cost: 0 input · 0 output

## Graph Freshness
- Built from commit: `e2f8af47`
- Run `git rev-parse HEAD` and compare to check if the graph is stale.
- Run `graphify update .` after code changes (no API cost).

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
2. `Presupuestos()` - 4 edges
3. `FichaObra()` - 3 edges
4. `EditarPresupuesto()` - 3 edges
5. `compilerOptions` - 2 edges
6. `paths` - 2 edges
7. `colorEstado()` - 2 edges
8. `formatFecha()` - 2 edges
9. `formatPrecio()` - 2 edges
10. `formatFecha()` - 2 edges

## Surprising Connections (you probably didn't know these)
- None detected - all connections are within the same source files.

## Import Cycles
- None detected.

## Communities (22 total, 10 thin omitted)

### Community 0 - "Dev Dependencies Config"
Cohesion: 0.14
Nodes (13): devDependencies, eslint, eslint-config-next, tailwindcss, @tailwindcss/postcss, name, private, scripts (+5 more)

### Community 1 - "Budget Detail Page"
Cohesion: 0.23
Nodes (8): BADGE_COLOR, ESTADOS, formatPrecio(), getHoy(), itemVacio(), MOCK_PRESUPUESTO, Presupuestos(), PlantillaPDF

### Community 2 - "Budget List Page"
Cohesion: 0.25
Nodes (5): CONCEPTOS, formatFecha(), formVacio, Gastos(), MESES

### Community 3 - "Work Order Detail Page"
Cohesion: 0.29
Nodes (4): formatFecha(), formVacio, MESES, Nomina()

### Community 4 - "Payroll Module"
Cohesion: 0.38
Nodes (5): BADGE_COLOR, EditarPresupuesto(), ESTADOS, formatFecha(), formatPrecio()

### Community 5 - "Runtime Dependencies"
Cohesion: 0.29
Nodes (7): dependencies, html2canvas, jspdf, next, react, react-dom, @supabase/supabase-js

### Community 6 - "Build Scripts"
Cohesion: 0.47
Nodes (3): colorEstado(), FichaObra(), formatFecha()

### Community 10 - "Work Orders List"
Cohesion: 0.50
Nodes (3): compilerOptions, paths, @/*

## Knowledge Gaps
- **41 isolated node(s):** `eslintConfig`, `@/*`, `nextConfig`, `config`, `CATEGORIAS` (+36 more)
  These have ≤1 connection - possible missing edges or undocumented components.
- **10 thin communities (<3 nodes) omitted from report** — run `graphify query` to explore isolated nodes.

## Suggested Questions
_Questions this graph is uniquely positioned to answer:_

- **Why does `dependencies` connect `Runtime Dependencies` to `Dev Dependencies Config`?**
  _High betweenness centrality (0.018) - this node is a cross-community bridge._
- **What connects `eslintConfig`, `@/*`, `nextConfig` to the rest of the system?**
  _41 weakly-connected nodes found - possible documentation gaps or missing edges._
- **Should `Dev Dependencies Config` be split into smaller, more focused modules?**
  _Cohesion score 0.14285714285714285 - nodes in this community are weakly interconnected._