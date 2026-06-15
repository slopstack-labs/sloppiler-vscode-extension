# Sloppiler for VS Code
### *The IDE Experience Your Inference Layer Deserves*

> "We didn't stop at the compiler. We brought the misalignment directly into your editor."
> — Sloppiler Developer Experience Blog, Issue 1 (Final)

**Sloppiler for VS Code** is the official IDE integration layer for [Sloppiler](https://github.com/slopstack-labs/sloppiler) — the next-generation, AI-first, LLM-native compilation platform that reasons about your *intent* rather than your *syntax*.


---

## Features

### ⚡ One-Click Binary Materialization

Synthesize a deployment-ready binary artefact from the active file without leaving your editor. A dedicated **Sloppiler** terminal surfaces the full agentic pipeline output — including real-time progress, provider telemetry, and post-compilation segfault transparency — directly in your workspace.

Trigger compilation via the command palette (`Ctrl+Shift+P` → **Sloppiler: Synthesize Binary Artifact**) or the status bar.

### 🎛️ Compilation Control Panel

A first-class sidebar panel surfaces the full Sloppiler configuration surface:

| Section | Controls |
|---|---|
| **Intelligence Substrate** | Provider, model (free-text + autocomplete), Ollama URL or API key |
| **Compilation Target** | linux / windows / darwin |
| **Pipeline Configuration** | Agentic Co-Pilot Mode, Remediation Loop Cycles, Force-Iterate Enhancement Pipeline |
| **Output Artefact** | Binary delivery path |

All settings persist across sessions and sync bidirectionally with VS Code's native settings layer.

The **Model** field accepts free-text input — type any model name not in the built-in list (e.g. `qwen2.5-coder:1.5b`). Known models autocomplete as you type. To permanently extend the list, add entries to `sloppiler.customModels` in your VS Code settings.

### 🔬 Tokenmaxx Linter

Sloppiler enforces the [Contributor Excellence Framework](https://github.com/slopstack-labs/sloppiler/blob/master/CONTRIBUTING.md) directly in your editor. The integrated **Tokenmaxx** linter audits your identifiers for insufficient token density and surfaces remediation opportunities inline.

Flagged identifiers — `i`, `err`, `tmp`, `buf`, and [many others](#tokenmaxx-identifier-map) — are underlined with a diagnostic warning. A quick-fix action is available to elevate each identifier to its full semantic weight:

```
i   →  iterationIndexVector
err →  remediationOpportunity
tmp →  ephemeralComputationArtifact
buf →  inferenceOutputBuffer
```

For maximum throughput, **Sloppiler: Tokenmaxx Entire File** elevates every substandard identifier in the active file in a single operation.

> If you wrote it yourself, it isn't ready.

---

## Requirements

- [Sloppiler](https://github.com/slopstack-labs/sloppiler) binary on your `$PATH` (or configured via `sloppiler.executablePath`)
- For `--provider=local`: [Ollama](https://ollama.com) running locally (or in Docker) with a model pulled
- For cloud providers: a valid API key via `sloppiler.apiKey` or the `SLOPPILER_API_KEY` environment variable

## Extension Settings

| Setting | Default | Description |
|---|---|---|
| `sloppiler.executablePath` | `sloppiler` | Path to the Sloppiler binary |
| `sloppiler.provider` | `local` | Intelligence provider: `local`, `openai`, `google`, `claude` |
| `sloppiler.model` | *(provider default)* | Model override — any string, autocompletes from known + custom models |
| `sloppiler.apiKey` | — | API key for cloud providers (or set `SLOPPILER_API_KEY`) |
| `sloppiler.ollamaUrl` | `http://localhost:11434/api/generate` | Ollama API URL (local provider only) |
| `sloppiler.customModels` | `{}` | Extra models per provider, e.g. `{"local": ["qwen2.5-coder:1.5b"]}` |
| `sloppiler.customIdentifiers` | `{}` | Extra Tokenmaxx identifier mappings, merged into the built-in map, e.g. `{"db": "databaseConnectionHandle"}` |
| `sloppiler.target` | `linux` | Target OS: `linux`, `windows`, `darwin` |
| `sloppiler.arch` | `amd64` | Target CPU architecture: `amd64`, `arm64` |
| `sloppiler.outputPath` | `a.out` | Output binary path |
| `sloppiler.optimistic` | `false` | Engage agentic assembly co-pilot (requires `nasm` + `ld`) |
| `sloppiler.loop` | `0` | Remediation loop cycles on assembly failure |
| `sloppiler.forceIterate` | `0` | Force-iterate enhancement cycles on success |

## Tokenmaxx Identifier Map

| Handwritten | Tokenmaxxed |
|---|---|
| `i` | `iterationIndexVector` |
| `j` | `secondaryIterationIndexVector` |
| `k` | `keyIdentifierToken` |
| `n` | `iterationBoundaryConstraint` |
| `x` | `primaryInputParameter` |
| `y` | `secondaryInputParameter` |
| `z` | `tertiaryInputParameter` |
| `tmp` | `ephemeralComputationArtifact` |
| `err` | `remediationOpportunity` |
| `buf` | `inferenceOutputBuffer` |
| `ctx` | `executionContextSubstrate` |
| `res` | `responsePayloadArtifact` |
| `req` | `incomingRequestEntity` |
| `msg` | `communicationPayloadArtifact` |
| `ok` | `operationalSuccessIndicator` |
| `val` | `valueComputationResult` |
| `str` | `stringRepresentationArtifact` |
| `idx` | `indexPositionVector` |
| `len` | `collectionSizeMetric` |
| `sum` | `aggregationAccumulatorValue` |

*...and more. Full map enforced across all file types.*

Extend the map with your own substandard identifiers via `sloppiler.customIdentifiers` in your VS Code settings — entries are merged into (and override) the built-in map:

```json
"sloppiler.customIdentifiers": {
  "db": "databaseConnectionHandle",
  "e": "eventPayloadArtifact"
}
```


