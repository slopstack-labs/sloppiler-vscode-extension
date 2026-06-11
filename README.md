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
| **Intelligence Substrate** | Provider, model, API key |
| **Compilation Target** | linux / windows / darwin |
| **Pipeline Configuration** | Agentic Co-Pilot Mode, Remediation Loop Cycles, Force-Iterate Enhancement Pipeline |
| **Output Artefact** | Binary delivery path |

All settings persist across sessions and sync bidirectionally with VS Code's native settings layer.

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
- For `--provider=local`: [Ollama](https://ollama.com) running locally with a model pulled
- For cloud providers: a valid API key via `sloppiler.apiKey` or the `SLOPPILER_API_KEY` environment variable

## Extension Settings

| Setting | Default | Description |
|---|---|---|
| `sloppiler.executablePath` | `sloppiler` | Path to the Sloppiler binary |
| `sloppiler.provider` | `local` | Intelligence provider: `local`, `openai`, `google`, `claude` |
| `sloppiler.model` | *(provider default)* | Model override |
| `sloppiler.apiKey` | — | API key (or set `SLOPPILER_API_KEY`) |
| `sloppiler.target` | `linux` | Target OS: `linux`, `windows`, `darwin` |
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


