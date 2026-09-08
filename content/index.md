---
title: FlatPPL
description: "FlatPPL, the Flat Portable Probabilistic Language: a minimal, inference-agnostic language for specifying probabilistic models."
---

[Try an example](https://live.flatppl.org/#model=examples%2Flinear-regression.flatppl) · [Read the spec](https://spec.flatppl.org/)

Start with the [Language overview](https://spec.flatppl.org/#sec:overview)
or [A first example](https://spec.flatppl.org/#sec:first-example).
[Install the VS Code extension](https://github.com/flatppl/flatppl-js/tree/main/packages/vscode-extension#installation)
to work with FlatPPL in your editor.

FlatPPL (the Flat Portable Probabilistic Language) describes deterministic and
stochastic scientific models in a human- and AI-friendly way. The "PPL" in the
name may also be read as "Probabilistic Programming Language", though we
stress portability over programming.

FlatPPL has a simple syntax, close to mathematical notation. It is "flat" in
the sense that models are just a series of assignments that bind names to
expressions, and that the language has no block structures, loops, or dynamic
control flow. While easy to write and read, FlatPPL is expressive and can
handle both small, simple models and large, complex ones: stochastic values
are first-class in FlatPPL, the language is rooted in measure theory, and it
supports advanced mathematical constructs like metric sums. On the surface,
though, the language is designed to be user-friendly and easily accessible.

The language is "portable" in the sense that it is not tied to a specific
implementation or compute architecture. FlatPPL is a domain-specific language,
designed to be used via multiple host-language APIs or end-user applications,
and to be powered by multiple independent engines. It is also designed to be
used as an exchange format for scientific models.

FlatPPL can express deterministic relationships, probability densities,
likelihoods, posteriors, and more, but doesn't prescribe what to do with them.
The model specifies deterministic and stochastic relationships that imply a
directed acyclic graph (DAG), not a specific use case. The application
(host-language program) controls whether the model is used for simulation
(generation), inference, or both, and which algorithms are applied.

## Specification

The language specification and documentation are available at
[spec.flatppl.org](https://spec.flatppl.org/).

## Playground

Browse FlatPPL examples and run FlatPPL live in your browser at [live.flatppl.org](https://live.flatppl.org/).

## Implementations

Several FlatPPL implementations are under development, in various stages of
maturity:

- A [JavaScript/TypeScript engine](https://github.com/flatppl/flatppl-js)
  (alpha quality) is available for running FlatPPL locally and in the
  browser. The JS engine and web application include limited simulation
  and inference capabilities as well as visualization of model graph
  structures and results.

- A [Rust toolchain](https://github.com/flatppl/flatppl-rust) for model
  conversion and compilation to MLIR is under development (partially
  functional but not end-user-ready).

- Host-language APIs in Python and Julia are currently being drafted and
  will be made available in the near future. They will make FlatPPL
  models usable for simulation and inference with several common Python and
  Julia statistics packages.

## Repositories

FlatPPL is open source and development happens in the
[flatppl](https://github.com/flatppl) GitHub organisation:

- [flatppl-design](https://github.com/flatppl/flatppl-design): the language specification.
- [flatppl-js](https://github.com/flatppl/flatppl-js): the JavaScript engine and playground, and the Visual Studio Code extension.
- [flatppl-rust](https://github.com/flatppl/flatppl-rust): the Rust FlatPPL tooling.
- [flatppl-grammars](https://github.com/flatppl/flatppl-grammars): FlatPPL grammars for code editors.
- [flatppl-examples](https://github.com/flatppl/flatppl-examples): example FlatPPL models.
- [flatppl-ai-skills](https://github.com/flatppl/flatppl-ai-skills): skills that teach AI coding agents to understand and generate FlatPPL.
- ... more to come soon ...

## Funding

This work was supported by Germany's Federal Ministry of Research, Technology
and Space (BMFTR) within the ErUM-Data programme under grant FKZ 05D25PC1
(DEMOS consortium).
