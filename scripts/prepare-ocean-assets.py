#!/usr/bin/env python3
"""Compress generated vocabulary art and create an auditable manifest/contact sheet.
Run with a Python environment containing Pillow after image generation finishes.
"""
import argparse
import json
from pathlib import Path
from PIL import Image, ImageDraw, ImageOps

parser = argparse.ArgumentParser(description=__doc__)
parser.add_argument('--allow-partial', action='store_true', help='Prepare existing cards and explicitly mark the missing IDs')
args = parser.parse_args()
root = Path(__file__).resolve().parents[1]
words = json.loads((root/'src/game/ocean/words.json').read_text())
originals = root/'output/imagegen'
target = root/'public/assets/words'
target.mkdir(parents=True, exist_ok=True)
missing = [w['id'] for w in words if not (originals/f"{w['id']}.png").exists()]
if missing and not args.allow_partial:
    raise SystemExit(f'Missing {len(missing)} originals: {", ".join(missing)}. Nothing changed; use --allow-partial only for explicit partial delivery.')
metadata_path = originals/'generation-manifest.json'
metadata = json.loads(metadata_path.read_text()) if metadata_path.exists() else {}
first_sample_ids = {'cat','dog','rabbit','bear','panda','monkey','pig','cow','elephant','apple'}
canvas = Image.new('RGB', (1440, 1440), '#eef2ed')
draw = ImageDraw.Draw(canvas)
manifest = {'prompt_set':'docs/ocean-image-prompts.jsonl','transform':'Whole image resized to fit 384 x 384; WebP quality 86','images':[], 'pending':missing}
for i, word in enumerate(words):
    source = originals/f"{word['id']}.png"
    x, y = (i % 6)*240, (i // 6)*240
    if source.exists():
        with Image.open(source) as loaded:
            image = loaded.convert('RGB')
            if min(image.size) < 512: raise SystemExit(f'Unexpected source size: {word["id"]} {image.size}')
            ImageOps.contain(image, (384,384), Image.Resampling.LANCZOS).save(target/f"{word['id']}.webp", quality=86, method=6)
            canvas.paste(ImageOps.contain(image, (220,210)), (x+10,y+5))
            info = metadata.get(source.name, {})
            manifest['images'].append({'id':word['id'], 'file':f"{word['id']}.webp", 'requested_model':info.get('model', 'gpt-image-2' if word['id'] in first_sample_ids else 'unknown'), 'source_size':list(image.size), 'generated_at':info.get('generated_at'), 'source':'AI-generated via user-configured OpenAI-compatible endpoint'})
    draw.text((x+12,y+222),word['english'] + (' (pending)' if not source.exists() else ''),fill='#234050')
canvas.save(originals/'word-cards-preview.jpg',quality=92)
(target/'manifest.json').write_text(json.dumps(manifest,ensure_ascii=False,indent=2)+'\n')
print(f'Prepared {len(manifest["images"])}/{len(words)} cards; {len(missing)} pending; {sum(p.stat().st_size for p in target.glob("*.webp"))} WebP bytes')
