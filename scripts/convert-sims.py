import os
from PIL import Image

def convert_to_webp(filename):
    source = f"public/sims/{filename}"
    target = f"public/sims/{filename.replace('.png', '.webp')}"
    
    # Создадим фиктивные картинки для теста, если их нет (в реальной задаче они уже были бы)
    if not os.path.exists(source):
        print(f"Creating placeholder for {source}")
        img = Image.new('RGBA', (256, 256), (100, 100, 100, 255))
        img.save(source)
        
    try:
        with Image.open(source) as img:
            img.save(target, "WEBP", quality=90)
            print(f"Converted {source} -> {target}")
    except Exception as e:
        print(f"Error converting {source}: {e}")

files = ["larva.png", "reactor.png", "roulette.png", "black_hole.png"]
for f in files:
    convert_to_webp(f)
