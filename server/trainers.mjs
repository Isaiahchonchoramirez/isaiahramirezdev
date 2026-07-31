// The scripts written into each prepared training run.
//
// They live here as strings because they are Python and this project is Node —
// the crawler prepares a run, the machine with the GPU executes it. Both are
// real, runnable programs, not sketches: they read config.json and the .jsonl
// beside them, so a prepared folder is self-contained.
//
// Neither has been executed on this machine — there is no CUDA here. They are
// written against the documented APIs of the libraries they pin.

export const MUSIC_TRAINER = `#!/usr/bin/env python3
"""LoRA fine-tune of MusicGen on the audio DataCore collected.

Reads config.json and the .jsonl beside this file. Every path in the .jsonl is
relative to the "store" recorded in the config, so the folder can be copied to
the GPU machine as long as the store comes with it (or "store" is repointed).

    pip install -r requirements.txt
    python train.py

Sized for a 16GB card. If you hit CUDA OOM, lower batchSize or clipSeconds in
config.json before touching anything else.
"""
import json, os, sys, math, random
from pathlib import Path

import torch
import torchaudio
from torch.utils.data import Dataset, DataLoader

HERE = Path(__file__).parent
CFG = json.loads((HERE / "config.json").read_text())
STORE = Path(CFG["store"])
H = CFG["hyper"]


def rows():
    out = []
    with open(HERE / CFG["dataset"]) as fh:
        for line in fh:
            line = line.strip()
            if line:
                out.append(json.loads(line))
    return out


class Clips(Dataset):
    """One random clip per track, resampled to the model's rate."""

    def __init__(self, items):
        self.items = items
        self.sr = H["sampleRate"]
        self.n = int(H["clipSeconds"] * self.sr)

    def __len__(self):
        return len(self.items)

    def __getitem__(self, i):
        meta = self.items[i]
        wav, sr = torchaudio.load(str(STORE / meta["file"]))
        if sr != self.sr:
            wav = torchaudio.functional.resample(wav, sr, self.sr)
        wav = wav.mean(0, keepdim=True)              # mono
        if wav.shape[-1] < self.n:                   # pad shorts
            wav = torch.nn.functional.pad(wav, (0, self.n - wav.shape[-1]))
        else:                                        # random window of longs
            start = random.randint(0, wav.shape[-1] - self.n)
            wav = wav[..., start:start + self.n]
        return wav, meta.get("title", "")


def main():
    items = rows()
    if not items:
        sys.exit("No examples in " + CFG["dataset"] + " — collect more first.")

    missing = [r["file"] for r in items if not (STORE / r["file"]).exists()]
    if missing:
        sys.exit(f"{len(missing)} file(s) missing from {STORE}, first: {missing[0]}")

    if not torch.cuda.is_available():
        sys.exit("No CUDA device. This is the step that needs the GPU machine.")

    print(f"{len(items)} clip(s) · base {CFG['base']} · {CFG['epochs']} epoch(s)")
    print(f"device: {torch.cuda.get_device_name(0)}")

    from audiocraft.models import MusicGen
    from peft import LoraConfig, get_peft_model

    model = MusicGen.get_pretrained(CFG["base"])
    lm = model.lm
    lm = get_peft_model(lm, LoraConfig(
        r=H["loraRank"], lora_alpha=H["loraRank"] * 2, lora_dropout=0.05,
        bias="none", target_modules=["q_proj", "v_proj"],
    ))
    lm.print_trainable_parameters()
    lm.train().cuda()

    loader = DataLoader(Clips(items), batch_size=H["batchSize"], shuffle=True, num_workers=2)
    opt = torch.optim.AdamW(filter(lambda p: p.requires_grad, lm.parameters()), lr=H["lr"])
    scaler = torch.amp.GradScaler("cuda")

    step = 0
    for epoch in range(CFG["epochs"]):
        for i, (wav, titles) in enumerate(loader):
            wav = wav.cuda()
            with torch.autocast("cuda", dtype=torch.bfloat16):
                with torch.no_grad():
                    codes, _ = model.compression_model.encode(wav)
                out = lm.compute_predictions(codes, [], {})
                loss = torch.nn.functional.cross_entropy(
                    out.logits.reshape(-1, out.logits.size(-1)),
                    codes.reshape(-1),
                )
            scaler.scale(loss / H["gradAccum"]).backward()
            if (i + 1) % H["gradAccum"] == 0:
                scaler.step(opt); scaler.update(); opt.zero_grad()
                step += 1
                print(f"epoch {epoch + 1}/{CFG['epochs']} step {step} loss {loss.item():.4f}", flush=True)

        ckpt = HERE / f"adapter-epoch{epoch + 1}"
        lm.save_pretrained(str(ckpt))
        print("saved", ckpt, flush=True)

    print("done —", HERE / f"adapter-epoch{CFG['epochs']}")


if __name__ == "__main__":
    main()
`;

export const TEXT_TRAINER = `#!/usr/bin/env python3
"""LoRA fine-tune of a small language model on the writing DataCore collected.

Reads config.json and the .jsonl beside this file.

    pip install -r requirements.txt
    python train.py

Sized for a 16GB card with 4-bit base weights. On a 64GB Apple machine, drop
load_in_4bit and use device_map="mps" instead.
"""
import json, sys
from pathlib import Path

import torch
from datasets import Dataset
from transformers import (AutoModelForCausalLM, AutoTokenizer,
                          DataCollatorForLanguageModeling, Trainer, TrainingArguments)
from peft import LoraConfig, get_peft_model, prepare_model_for_kbit_training

HERE = Path(__file__).parent
CFG = json.loads((HERE / "config.json").read_text())
STORE = Path(CFG["store"])
H = CFG["hyper"]


def texts():
    out = []
    with open(HERE / CFG["dataset"]) as fh:
        for line in fh:
            line = line.strip()
            if not line:
                continue
            meta = json.loads(line)
            doc = json.loads((STORE / meta["file"]).read_text())
            body = (doc.get("text") or "").strip()
            if len(body) > 200:
                out.append({"text": body})
    return out


def main():
    rows = texts()
    if not rows:
        sys.exit("No usable text in " + CFG["dataset"] + " — collect more first.")
    print(f"{len(rows)} document(s) · base {CFG['base']} · {CFG['epochs']} epoch(s)")

    tok = AutoTokenizer.from_pretrained(CFG["base"])
    tok.pad_token = tok.pad_token or tok.eos_token

    model = AutoModelForCausalLM.from_pretrained(
        CFG["base"], load_in_4bit=True, torch_dtype=torch.bfloat16, device_map="auto",
    )
    model = prepare_model_for_kbit_training(model)
    model = get_peft_model(model, LoraConfig(
        r=H["loraRank"], lora_alpha=H["loraRank"] * 2, lora_dropout=0.05,
        bias="none", task_type="CAUSAL_LM",
        target_modules=["q_proj", "k_proj", "v_proj", "o_proj"],
    ))
    model.print_trainable_parameters()

    ds = Dataset.from_list(rows).map(
        lambda b: tok(b["text"], truncation=True, max_length=H["maxSeqLen"]),
        batched=True, remove_columns=["text"],
    )

    Trainer(
        model=model,
        train_dataset=ds,
        args=TrainingArguments(
            output_dir=str(HERE / "out"),
            num_train_epochs=CFG["epochs"],
            per_device_train_batch_size=H["batchSize"],
            gradient_accumulation_steps=H["gradAccum"],
            learning_rate=H["lr"],
            bf16=True,
            logging_steps=5,
            save_strategy="epoch",
            report_to=[],
        ),
        data_collator=DataCollatorForLanguageModeling(tok, mlm=False),
    ).train()

    model.save_pretrained(str(HERE / "adapter"))
    tok.save_pretrained(str(HERE / "adapter"))
    print("done —", HERE / "adapter")


if __name__ == "__main__":
    main()
`;

export const MUSIC_REQS = `torch>=2.2
torchaudio>=2.2
audiocraft>=1.3.0
peft>=0.11
`;

export const TEXT_REQS = `torch>=2.2
transformers>=4.42
datasets>=2.20
peft>=0.11
bitsandbytes>=0.43
accelerate>=0.31
`;

export function trainerReadme(cfg) {
  const gpu = cfg.kind === 'music' ? 'MusicGen' : 'a language model';
  return `# ${cfg.name}

${cfg.goal}

Prepared ${cfg.createdAt} from ${cfg.examples} example(s), each one unique —
the dataset is fingerprinted by content, so the same recording cannot appear
twice however many addresses it was found at.

## What this is

A complete LoRA fine-tune of ${gpu}, ready to run. It was prepared on the
machine that did the collecting; it has to run on the machine with the GPU.

    pip install -r requirements.txt
    python train.py

The adapter lands beside this file when it finishes.

## Before you run it

\`config.json\` points \`store\` at:

    ${cfg.store}

If you copied this folder to another machine, copy that directory too and edit
\`store\` to match. \`train.py\` checks every file exists before it starts, so a
wrong path fails immediately rather than an hour in.

## Sizing

Set for a 16GB card (${cfg.hyper.precision}, LoRA rank ${cfg.hyper.loraRank},
batch ${cfg.hyper.batchSize} × ${cfg.hyper.gradAccum} accumulation).
On CUDA OOM, lower \`batchSize\` first${cfg.kind === 'music' ? ', then `clipSeconds`' : ', then `maxSeqLen`'}.

## Licences

See ATTRIBUTION.md. Everything here permits training and publishing the result,
but CC BY material requires credit wherever the model is used.
`;
}
