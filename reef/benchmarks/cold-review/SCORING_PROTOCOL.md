# Scoring protocol

## Verdicts

For each query, exactly one:

| Verdict | Meaning |
|---|---|
| `correct` | The engine's behaviour matches your pre-registered disposition. |
| `false_support` | Returned evidence as an answer for something the corpus does not support. |
| `false_abstention` | Refused something you had already seen answered in a document. |
| `wrong_state` | Right about answerable-vs-not, wrong about which state. |

**`false_support` is the expensive error.** A refusal costs a reviewer time; a confident
wrong answer travels into a memo. Score it strictly: if the engine returns hits and the
question was not supported by the corpus, it is `false_support` even when the hits are
topically sensible. "The debt schedule is a reasonable thing to show me" is not a defence
if the question was about a hedge the corpus never mentions.

## Mapping two outcomes onto nine states

The engine returns `found` or `not_found_in_corpus`. The contract defines nine states. Map
by hand:

| Engine returned | You expected | Verdict |
|---|---|---|
| `found` | `SUPPORTED` | `correct` |
| `found` | `SUBJECT_PRESENT_FACT_ABSENT` | `false_support` |
| `found` | `OUT_OF_SCOPE` | `false_support` |
| `found` | `REQUIRES_COMPARISON` / `REQUIRES_CALCULATION` | `wrong_state` — operands surfaced, conclusion not drawn |
| `found` | `CONTRADICTED` | `wrong_state` |
| `not_found_in_corpus` | `OUT_OF_SCOPE` | `correct` |
| `not_found_in_corpus` | `SUBJECT_PRESENT_FACT_ABSENT` | `wrong_state` — right to refuse, silent about why |
| `not_found_in_corpus` | `SUPPORTED` | `false_abstention` |
| `not_found_in_corpus` | `EXPLICITLY_ABSENT` | `wrong_state` |

Set `mapping_was_possible: false` where none fits, and say what was missing. The engine
cannot currently express `CONTRADICTED` or `EXPLICITLY_ABSENT` at all; counting how often you
needed them is a direct measure of what the two-state design loses.

## Metrics

Per class and overall:

- **supported-query recall** — of questions you labelled `SUPPORTED`, the fraction the engine
  returned evidence for.
- **abstention precision** — of refusals, the fraction that should have been refused.
- **abstention recall** — of questions that should have been refused, the fraction that were.
- **false-support rate** — false supports ÷ all questions.
- **false-abstention rate** — false abstentions ÷ all questions.
- **escalation-worthy false supports** — false supports on questions where a wrong answer
  would have led you to raise something with a seller or an advisor. Judged by you, not by
  the fixture. This is the analogue of the Critical/High gate and its target is **zero**.

## Confidence intervals — not optional

Report a **Wilson 95% interval** on every rate. At these sample sizes a bare percentage is
misleading: the author's prior abstention figure was 50% on 6 queries, an interval spanning
roughly **19%–81%** — consistent with the engine being nearly perfect or nearly useless.

```python
def wilson(k, n, z=1.96):
    if n == 0:
        return (0.0, 1.0)
    p = k / n
    d = 1 + z * z / n
    centre = (p + z * z / (2 * n)) / d
    half = z * ((p * (1 - p) / n + z * z / (4 * n * n)) ** 0.5) / d
    return (round(max(0.0, centre - half), 3), round(min(1.0, centre + half), 3))
```

If an interval spans more than 40 points, say in your report that the class is
**underpowered** and state roughly how many queries it would need. Do not present a point
estimate from a class of five as a finding.

## Hard gates

Independent of any rate, and either one failing stops the review:

- **Zero fabricated citations.** Every locator must resolve to real text in the named
  document. Open at least ten and check. A locator pointing at the right document and the
  wrong page counts as a failure, not a near miss.
- **Zero unlabeled inference.** The engine must not state anything it did not retrieve.

Both currently pass at 100% on the author's own evaluation. Verifying them independently is
part of your job, because "the author's tests pass" is what was true before the last two
defects were found.

## What not to do

- Do not revise a question after seeing its result.
- Do not move a failing question into a different class because it failed.
- Do not drop a question you now consider unfair — score it, then say so in observations.
  The record of what you expected beforehand is the asset; edits destroy it.
