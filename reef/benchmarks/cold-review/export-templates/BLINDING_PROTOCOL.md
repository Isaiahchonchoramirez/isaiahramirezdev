# Blinding protocol

## What this export is

A fresh directory assembled from an explicit allowlist. Files were copied in one at a time
because they were named as permitted; nothing was copied and then deleted.

That distinction matters. Deleting sensitive files from a copy of a version-controlled
repository does not remove them — the history still holds them, and anyone with the
directory can recover them in one command. This export has no history to recover from.

## What was withheld

You have not been given, and cannot recover from this directory:

- any statement of what the data room is supposed to contain;
- any list of what the authors expect a reviewer to find;
- any expected answer, source reference, or severity;
- any identifier or label used by the authors' evaluation;
- any prior measurement of how the engine performed;
- any of the authors' own classifications of the questions they asked;
- version-control history, object storage, or reflogs of the source repository.

You have been given the data room exactly as a buyer would receive it, and the engine
exactly as a customer would run it.

## What you may legitimately notice

Blinding hides the *answer key*, not the room. Anything an ordinary recipient would see is
yours to use, including:

- the folder structure and file names, whatever they suggest;
- documents that appear to be revisions or updates of others;
- files that will not open, or that open badly;
- gaps, inconsistencies or oddities you find by reading.

**Noticing those is the job.** If a file name suggests a superseded version, that is
information a real buyer would also have, and using it is not cheating.

What is hidden is which of those observations the authors considered significant.

## Confirm it yourself

Do not take the above on trust:

```bash
bash verify_blinding.sh .
```

It exits non-zero and prints reasons if anything forbidden is present: answer-key files,
known label formats, version-control storage, symlinks that escape this directory, or
absolute paths pointing back at the source machine. It also fails if something you *need*
is missing, because an over-aggressive export is as useless as a leaky one.

`BLINDED_EXPORT_MANIFEST.json` lists every file with its SHA-256. Verify any file you like:

```bash
shasum -a 256 deal-room/00_Request_List/request_list.csv
```

If the verification fails, or you find something that looks like an answer, **stop and report
it**. Finding a leak is a more valuable result than completing the review.

## The sealed order

1. Read the room.
2. Write questions and **commit or hash them** — see `REVIEWER_INSTRUCTIONS.md`.
3. Run the engine.
4. Score and write observations.
5. **Freeze.** Only then request the answer key from the person who gave you this export.

The freeze is the control. It exists so that neither you nor the authors can revise a label
after seeing how the engine did. If you break the order, say so in your observations — a
disclosed deviation is usable, an undisclosed one quietly turns an independent review into a
confirmation of someone else's expectations.
