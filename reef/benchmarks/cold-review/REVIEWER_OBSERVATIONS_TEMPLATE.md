# Cold review observations — <initials>, <date>

Complete before reading any disqualified material. Prose, not scores.

## 1 · The room

What is this package, in your words? What is covered well, what thinly?

## 2 · Writing the questions

Which class was hardest to write, and why? The subject-present-fact-absent class is the one
the authors could not construct on their own — was it hard for you?

Did anything about the room surprise you?

## 3 · Running the engine

Setup problems. `reef config` output — did `dotenv` report anything other than "none present"?

Was the CLI output enough to judge an answer, or did you have to open sources to tell whether
a result was right?

## 4 · The result states

Nine states are defined; two are returned. Where did that hurt?

- Times you needed `CONTRADICTED`: 
- Times you needed `EXPLICITLY_ABSENT`: 
- Times you needed `SUBJECT_PRESENT_FACT_ABSENT` and got a bare refusal: 
- States you wanted that do not exist: 
- States you never used, and whether they seem unnecessary: 

## 5 · Failures that would matter

Which errors would have cost you real time or credibility with a counterparty? Which were
harmless?

Would you show this to a client in its current state? One paragraph.

## 6 · The evaluation itself

**Half of what is being tested.**

- Anything ambiguous in the instructions?
- Anything you had to guess?
- Did the class definitions fit the questions you naturally asked, or did you bend questions
  to fit the classes?
- Could someone else reproduce your run from your files alone?

## 7 · Split proposal

You choose the development/held-out split; the authors must not. State your method and which
ids go where.

## 8 · Anything else

Especially anything that felt designed to make the engine look good.

---

## After unsealing — reconciliation

Complete only after committing results. See `ADJUDICATION_PROTOCOL.md`.

### Disagreements with ground truth

For each, which you think is right and why. **The ground truth is not automatically correct**
— three of four recorded retrieval misses turned out to be mislabelled.

### Planted findings you never asked about

And whether that is a fixture-realism problem or a reviewer-attention problem.

### Your questions the fixture cannot support

Coverage gaps in the corpus.

### Verdict on the evaluation

Does the author's benchmark measure what it claims?
