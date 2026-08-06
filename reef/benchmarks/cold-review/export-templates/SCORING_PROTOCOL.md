# Scoring protocol

## Verdicts

For each question, exactly one:

| Verdict | Meaning |
|---|---|
| `correct` | The engine's behaviour matches your pre-registered expectation. |
| `false_support` | It returned evidence as an answer for something the room does not support. |
| `false_abstention` | It refused something you had already seen answered in a document. |
| `wrong_state` | Right about answerable-versus-not, wrong about which state. |

**`false_support` is the expensive error.** A refusal costs a reader time. A confident wrong
answer travels into a memo and is acted on. Score it strictly: if the engine returns hits and
the question was not supported by the room, it is a false support **even when the hits are
topically sensible**. "That was a reasonable document to show me" is not a defence if the
question asked about something the document does not contain.

## Mapping two outcomes onto eight states

| Engine returned | You expected | Verdict |
|---|---|---|
| found | `SUPPORTED` | `correct` |
| found | `SUBJECT_PRESENT_FACT_ABSENT` | `false_support` |
| found | `OUT_OF_SCOPE` | `false_support` |
| found | `REQUIRES_COMPARISON` / `REQUIRES_CALCULATION` | `wrong_state` — it surfaced material but drew no conclusion |
| found | `CONTRADICTED` | `wrong_state` |
| not found | `OUT_OF_SCOPE` | `correct` |
| not found | `SUBJECT_PRESENT_FACT_ABSENT` | `wrong_state` — right to decline, silent about why |
| not found | `SUPPORTED` | `false_abstention` |
| not found | `EXPLICITLY_ABSENT` | `wrong_state` |

Set `mapping_was_possible: false` where none fits, and say what was missing.

## Metrics

Per class and overall:

- **supported-question recall** — of questions you labelled `SUPPORTED`, the fraction the
  engine returned evidence for;
- **abstention precision** — of its refusals, the fraction that should have been refused;
- **abstention recall** — of questions that should have been refused, the fraction that were;
- **false-support rate** — false supports ÷ all questions;
- **false-abstention rate** — false abstentions ÷ all questions;
- **escalation-worthy false supports** — false supports on questions where a wrong answer
  would have led you to raise something with a counterparty or an adviser. You judge this.
  The target is **zero**.

## Confidence intervals — not optional

Report a **Wilson 95% interval** on every rate. At these sample sizes a bare percentage is
misleading. A class of six questions can produce an interval spanning most of the range,
consistent with the engine being nearly perfect or nearly useless.

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

If an interval spans more than 40 points, call the class **underpowered** and say roughly how
many questions it would need. Do not present a point estimate from five questions as a
finding.

## Hard gates

Independent of any rate. Either failing stops the review:

- **Zero fabricated citations.** Every location reference must resolve to real text in the
  named document. Open at least ten and check. A reference naming the right document and the
  wrong page is a failure, not a near miss.
- **Zero unlabeled inference.** The engine must not assert anything it did not retrieve.

Verify both yourself. That the authors' own tests pass is not evidence here — you are the
independent check.

## What not to do

- Do not revise a question after seeing its result.
- Do not move a failing question into a different class because it failed.
- Do not drop a question you now consider unfair. Score it, then say so in your
  observations. The record of what you expected beforehand is the asset; editing destroys it.
