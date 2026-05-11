# Axiom Forecast Experiment

This folder packages Axiom's current product state for a MiroFish-style social reception forecast.

Goal:

Use a multi-agent social simulation to predict how real users may understand, adopt, criticize, misuse, or ignore Axiom before the project over-invests in the wrong product direction.

Files:

- `seed.md`: the product context to feed into MiroFish.
- `protocol.md`: simulation roles, questions, phases, and expected output.
- `run-log.md`: concrete run notes from this workspace.
- `results/dry-run-forecast.md`: a local dry-run forecast produced before a full MiroFish simulation is available.
- `tools/write-mirofish-env.ps1`: local helper for writing MiroFish credentials to `.env` without pasting secrets into chat.

Current public repo snapshot:

```text
https://github.com/fatelvx/axiom
commit ae71046 Mark attention graph JSON filter
```

Use this experiment as forecast input, not as a replacement for real users. A useful forecast should produce falsifiable adoption risks, concrete messaging changes, and roadmap tradeoffs.

## Local Credential Entry

Do not paste API keys into chat. Use the local helper:

```powershell
powershell -ExecutionPolicy Bypass -File experiments\axiom-forecast\tools\write-mirofish-env.ps1
```

The script finds the latest `<temp>/axiom-mirofish-*` clone by default and writes MiroFish credentials to that clone's `.env`.
