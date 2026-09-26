#!/usr/bin/env python3
import json
from pathlib import Path
from PIL import Image, ImageDraw
root=Path(__file__).resolve().parents[1]
words=json.loads((root/'src/game/ocean/words.json').read_text())
src=root/'output/imagegen'; dst=root/'public/assets/words'; dst.mkdir(parents=True,exist_ok=True)
missing=[]
manifest={'type':'3x3-sprite-sheets','grid':3,'prompt_set':'docs/ocean-sprite-prompts.jsonl','sheets':[]}
for i in range(4):
 sheet=f'sheet-{i+1:02d}.png'; source=src/sheet
 if not source.exists(): missing.append(sheet); continue
 with Image.open(source) as im:
  im=im.convert('RGB')
  if im.width != im.height or im.width < 1024: raise SystemExit(f'Invalid sheet {source}: {im.size}')
  # Keep the full image as one WebP; browser crops via background-position.
  im.save(dst/sheet.replace('.png','.webp'),quality=86,method=6)
  manifest['sheets'].append({'file':sheet.replace('.png','.webp'),'source_size':list(im.size),'words':[w['id'] for w in words if w['sheet']==sheet.replace('.png','.webp')]})
if missing: raise SystemExit('Missing sheets: '+', '.join(missing))
(dst/'manifest.json').write_text(json.dumps(manifest,ensure_ascii=False,indent=2)+'\n')
print('Prepared',len(manifest['sheets']),'sprite sheets')
