# Cold review observations — <initials>, <date>

Complete **before** requesting the answer key. Prose, not scores.

## 1 · The room

What is this package, in your own words? What is covered well, what thinly?

## 2 · Writing the questions

Which class was hardest to write, and why?

Anything about the room that surprised you?

## 3 · Running the engine

Setup problems. What did `reef config` report for `dotenv`?

Was the output enough to judge an answer, or did you have to open the source documents to
tell whether a result was right?

## 4 · The result states

Eight states are defined; the engine returns two. Where did that hurt?

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
- Did anything feel designed to make the engine look good?

## 7 · Split proposal

You choose the development/held-out split. State your method and which ids go where.

## 8 · Blinding

Did `verify_blinding.sh` pass? Did you encounter anything that looked like an expected
answer, a label, or a note from the authors? If so, what and where — this matters more than
the rest of the review.

---

## After unsealing

Complete only after freezing the above. See `ADJUDICATION_HANDOFF.md`.

### Disagreements with the answer key

For each: your label, theirs, and which you think is right. **The answer key is not
automatically correct.**

### Things the key covers that you never thought to ask about

And whether that reflects the room being unrealistic or your attention wandering.

### Your questions the room cannot support

Coverage gaps.

### Verdict

Does the authors' evaluation measure what it claims to?
