# MiroFish Observe Backtest: Axiom Observability Surface

Date: 2026-05-11

Product snapshot:

```text
https://github.com/fatelvx/axiom
commit ba24b7d Add architecture observe surface
```

## What Changed Before This Backtest

This backtest was run after a real implementation change, not only a positioning change.

Implemented change:

- Added `axi observe --root .`.
- `axi observe` reuses the same validation result as `axi check`.
- It presents the architecture attention surface: hard violations, visible intentional violations, and advisory warnings.
- It exits `0`, because it is an observability command, not the CI gate.
- `axi check` remains the hard gate.
- Public wording shifted to "architecture observability layer with enforceable contracts."

Updated product thesis:

```text
Code can be locally correct while globally collapsing.
```

Boundary:

```text
Observe first, negotiate accepted tradeoffs, enforce only high-confidence intent.
```

## Method

The updated forecast seed, prompt, README, and guides were copied into the local MiroFish clone.

A full ontology generation rerun was attempted first with the compact updated seed and prompt. It timed out after 180 seconds while the backend log was still at:

```text
调用 LLM 生成本体定义...
```

Because this repeated the earlier MiroFish ontology-generation fragility, the backtest switched to a targeted ReportAgent run against the existing Axiom forecast graph and simulation environment. The targeted prompts explicitly included the new `axi observe` behavior and asked for a risk-map style evaluation.

Local temp artifacts:

```text
<local-temp>/axiom-mirofish-1778473109/axiom_forecast_outputs_observe/
```

Tracked summary only is published here. Local raw JSON may contain runtime metadata and is not needed for public review.

## Main Result

The backtest did not reject the observability pivot, but it also did not treat `axi observe` as sufficient by itself.

The strongest finding:

- `axi observe` improves the product surface by reducing the feeling of immediate enforcement.
- It still risks being read as a nicer Dependency Cruiser unless Axiom adds stronger drift and coupling signals.
- `symbol-level API health` remains the largest credibility gap.
- The next step should not be a claim of full semantic architecture understanding.
- The next step should be a small, low-noise proxy signal that makes architecture entropy more observable.

## Chinese Output Excerpts

Targeted backtest excerpt:

```text
这意味着一开始的高频 advisory warnings 极易被开发者社区直接归类为噪声，从而让“非强制执行”变成“无人理睬”。只有严格执行“仅高置信度合同为硬错误”并压低警告数量，才有可能避免被贴上 noisy linter 的标签。
```

```text
如果 visible intentional violations 的展示方式过于像静态报表，会被前端平台负责人和 DevOps 团队视为又一种官僚主义全景图而忽视。要脱离“被动”，axi observe 必须提供可操作的入口，例如直接在 PR 中驱动讨论，否则仍可能沦为高级仪表盘。
```

```text
在缺失符号级 API 健康验证的情况下，axi observe 的输出看起来确实像更花哨的依赖分析。这让“本地正确但全局崩溃”这一有力定义无从验证，进而被资深工程师降级为“又一个有想法的玩具”。
```

Constrained next-signal prompt result:

```text
排序
E > D > B > F > A > C
```

Where:

- E = module fan-in/fan-out concentration warning
- D = new observed edge since baseline
- B = public surface churn over time
- F = PR-focused observe output
- A = public surface size / export count advisory
- C = intentional violation age / debt aging summary

Excerpt:

```text
集中度警告直接暴露过度依赖的中枢模块，是静态可观测、最接近“语义架构健康”的代理信号，高冲击、低数量，完美契合 validator-first 方向。
```

Excerpt:

```text
通过基线对比，新增边是一阶异常指标，能提示未声明耦合的渗入，弥补 v0 对隐式耦合的不可见。
```

## Interpretation

This result is useful precisely because it is not simply positive.

`axi observe` is directionally correct, but it is not the moat. It is the correct front door for architecture observability. The next value must come from better low-noise signals inside that surface.

The backtest suggests a near-term sequence:

1. Keep `axi observe` as the product-facing attention surface.
2. Add a low-noise coupling concentration signal before broad semantic analysis.
3. Then consider baseline-aware "new observed edge" drift detection.
4. Keep public API size or export count as context, not a primary warning.
5. Do not claim full symbol-level API health.

## Product Decision Signal

Adopt:

- `axi observe` as the observability surface.
- Module fan-in/fan-out concentration as the next candidate advisory signal.
- Baseline edge drift as a follow-up once baseline storage is designed.

Avoid:

- Full semantic architecture health claims.
- High-volume export-count warnings.
- Turning intentional-violation aging into the next main feature before coupling/drift signals improve.

## Caveat

This was a targeted MiroFish ReportAgent backtest using the previous forecast graph plus updated prompt material. It is a useful risk map, not real user research or market proof.
