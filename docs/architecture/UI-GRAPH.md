# UI architecture graph

CODE = truth. GRAPH = derived observation map.

| Artifact | Role |
|---|---|
| `ui-graph.json` | Machine-readable map for MCP / agents |
| `ui-graph.mmd` | Human Mermaid view — generated from JSON only |
| `scripts/build-ui-graph.mjs` | Generator + non-blocking `--check` |

```bash
pnpm graph:ui      # rebuild JSON + Mermaid (stamps HEAD SHA)
pnpm graph:check   # GRAPH_CURRENT | GRAPH_STALE | GRAPH_INVALID (non-blocking)
```

Do not edit `ui-graph.mmd` by hand. Enrich the catalog in the generator when real product regions change.
