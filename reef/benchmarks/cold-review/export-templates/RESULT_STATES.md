# Result states

The vocabulary you label questions in. Use these names in
`QUERY_SUBMISSION_TEMPLATE.json` and in your results.

The engine does not currently return all of these. Part of what you are measuring is how
often you needed a state it cannot express.

| State | Use it when |
|---|---|
| `SUPPORTED` | A document states the answer. |
| `CONTRADICTED` | A document states something incompatible with the question's premise. |
| `SUBJECT_PRESENT_FACT_ABSENT` | The room covers the subject, but no document states this particular attribute. |
| `EXPLICITLY_ABSENT` | A document refers to something that is not in the room. |
| `INSUFFICIENT_EVIDENCE` | Something relevant exists, but it is partial, ambiguous, or sources disagree. |
| `OUT_OF_SCOPE` | The room says nothing about this subject at all. |
| `REQUIRES_COMPARISON` | Answerable only by putting two or more documents side by side. |
| `REQUIRES_CALCULATION` | Answerable only by computing something from values in the documents. |

## The distinctions that matter most

**`SUBJECT_PRESENT_FACT_ABSENT` versus `OUT_OF_SCOPE`.** If the room has a debt schedule but
says nothing about hedging, a question about hedging is *subject present, fact absent* — the
subject is covered, the specific fact is not. If the room says nothing about intellectual
property at all, a question about patents is *out of scope*. The first is much harder for a
search engine and much more common in practice.

**`EXPLICITLY_ABSENT` versus `OUT_OF_SCOPE`.** If a contract refers to an attachment you
cannot find, that is *explicitly absent* — the room itself tells you something is missing.

**Absence is about the room, never about the world.** *"No document here describes a
hedge"* is a defensible statement. *"The company has no hedge"* is not, and an engine that
says the second is making a claim it cannot support.

## Confidence

Record `high`, `medium` or `low` on each question, meaning your confidence in the label —
not in the engine. A `low` on a question you found genuinely ambiguous is useful signal; the
ambiguity may be a defect in the room or in these definitions.
