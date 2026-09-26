import json, subprocess, urllib.request
from pathlib import Path
root=Path(__file__).resolve().parents[1]
# Existing 36 plus 18 useful concrete nouns. OpenMoji codepoints are stable filenames.
data=[
('cat','猫','animal','1F408'),('dog','狗','animal','1F415'),('rabbit','兔子','animal','1F407'),('bear','熊','animal','1F43B'),('panda','熊猫','animal','1F43C'),('lion','狮子','animal','1F981'),('monkey','猴子','animal','1F412'),('pig','猪','animal','1F416'),('cow','奶牛','animal','1F404'),
('elephant','大象','animal','1F418'),('fish','鱼','animal','1F41F'),('turtle','乌龟','animal','1F422'),('apple','苹果','fruit','1F34E'),('banana','香蕉','fruit','1F34C'),('pear','梨','fruit','1F350'),('strawberry','草莓','fruit','1F353'),('watermelon','西瓜','fruit','1F349'),('pineapple','菠萝','fruit','1F34D'),
('bread','面包','food','1F35E'),('cheese','奶酪','food','1F9C0'),('egg','鸡蛋','food','1F95A'),('carrot','胡萝卜','food','1F955'),('corn','玉米','food','1F33D'),('cake','蛋糕','food','1F370'),('car','汽车','vehicle','1F697'),('bus','公交车','vehicle','1F68C'),('train','火车','vehicle','1F686'),('bicycle','自行车','vehicle','1F6B2'),
('airplane','飞机','vehicle','2708'),('boat','帆船','vehicle','26F5'),('ball','足球','object','26BD'),('book','书','object','1F4D6'),('key','钥匙','object','1F511'),('umbrella','雨伞','object','2602'),('clock','时钟','object','1F550'),('guitar','吉他','object','1F3B8'),
('sun','太阳','nature','2600'),('moon','月亮','nature','1F319'),('star','星星','nature','2B50'),('flower','花朵','nature','1F33C'),('tree','树','nature','1F333'),('house','房子','place','1F3E0'),('bed','床','object','1F6CF'),('chair','椅子','object','1FA91'),('pencil','铅笔','object','270F'),('scissors','剪刀','object','2702'),('phone','电话','object','1F4F1'),('camera','相机','object','1F4F7'),('gift','礼物','object','1F381'),('shoe','鞋子','object','1F45F'),('shirt','衬衫','object','1F455'),('hat','帽子','object','1F3A9'),('milk','牛奶','food','1F95B'),('cookie','饼干','food','1F36A'),('icecream','冰淇淋','food','1F366'),('pizza','披萨','food','1F355'),('hamburger','汉堡','food','1F354'),('lemon','柠檬','fruit','1F34B'),('grapes','葡萄','fruit','1F347'),('cherry','樱桃','fruit','1F352'),('peach','桃子','fruit','1F351'),('orange','橙子','fruit','1F34A'),('tomato','番茄','food','1F345')]
assert len(data)==63 and len({x[0] for x in data})==63
out=root/'public/assets/openmoji'; out.mkdir(parents=True,exist_ok=True)
license_path=out/'LICENSE.txt'
license_path.write_bytes(urllib.request.urlopen('https://raw.githubusercontent.com/hfg-gmuend/openmoji/master/LICENSE.txt').read())
entries=[]
for i,(id,zh,cat,cp) in enumerate(data):
 path=out/f'{id}.svg'; url=f'https://raw.githubusercontent.com/hfg-gmuend/openmoji/master/color/svg/{cp}.svg'
 try: path.write_bytes(urllib.request.urlopen(url,timeout=20).read())
 except Exception as e: print('MISSING',id,cp,e); continue
 entries.append({'id':id,'english':id,'chinese':zh,'category':cat,'codepoint':cp})
assert len(entries)==63, f'{len(entries)} assets downloaded'
# Build six 3x3 PNG atlases. SVG assets are rendered at 256 square on a warm card.
import cairosvg
from PIL import Image,ImageOps,ImageDraw
atlas=root/'public/assets/words'; atlas.mkdir(exist_ok=True)
for sheet in range(7):
 group=entries[sheet*9:(sheet+1)*9]; canvas=Image.new('RGB',(1152,1152),'#faf7ef')
 for j,w in enumerate(group):
  png=cairosvg.svg2png(url=str(out/f"{w['id']}.svg"),output_width=340,output_height=340)
  import io
  im=Image.open(io.BytesIO(png)).convert('RGBA'); bg=Image.new('RGBA',im.size,'#faf7ef'); bg.alpha_composite(im)
  cell=ImageOps.contain(bg.convert('RGB'),(360,360),Image.Resampling.LANCZOS); x=(j%3)*384+(384-cell.width)//2; y=(j//3)*384+(384-cell.height)//2; canvas.paste(cell,(x,y))
  w.update(sheet=f'sheet-{sheet+1:02d}.webp',col=j%3,row=j//3)
 canvas.save(root/'output-imagegen-openmoji'/f'sheet-{sheet+1:02d}.png',quality=95) if False else None
 canvas.save(atlas/f'sheet-{sheet+1:02d}.webp',quality=86,method=6)
(root/'src/game/ocean/words.json').write_text(json.dumps(entries,ensure_ascii=False,indent=2)+'\n')
(atlas/'openmoji-manifest.json').write_text(json.dumps({'source':'OpenMoji','source_url':'https://github.com/hfg-gmuend/openmoji','license':'CC BY-SA 4.0','grid':'3x3','word_count':len(entries),'sheets':[f'sheet-{i:02d}.webp' for i in range(1,8)]},ensure_ascii=False,indent=2)+'\n')
print('Downloaded and composed',len(entries),'OpenMoji cards into 6 sheets')
