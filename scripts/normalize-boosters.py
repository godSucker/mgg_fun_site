import os
from PIL import Image

def normalize_icon(image_path, canvas_size=(128, 128), target_inner_size=100):
    try:
        with Image.open(image_path) as img:
            img = img.convert("RGBA")
            
            # Находим реальные границы иконки (bbox)
            bbox = img.getbbox()
            if not bbox:
                return
            
            # Обрезаем до реального контента
            img_trimmed = img.crop(bbox)
            w, h = img_trimmed.size
            
            # Рассчитываем масштаб, чтобы вписать контент в target_inner_size, сохраняя пропорции
            ratio = min(target_inner_size / w, target_inner_size / h)
            new_w = int(w * ratio)
            new_h = int(h * ratio)
            
            img_resized = img_trimmed.resize((new_w, new_h), Image.Resampling.LANCZOS)
            
            # Создаем новый квадратный холст
            final_canvas = Image.new("RGBA", canvas_size, (0, 0, 0, 0))
            
            # Вставляем в центр
            offset = ((canvas_size[0] - new_w) // 2, (canvas_size[1] - new_h) // 2)
            final_canvas.paste(img_resized, offset)
            
            # Сохраняем
            final_canvas.save(image_path, "WEBP")
            print(f"Fixed: {image_path} ({w}x{h} -> {new_w}x{new_h})")
            
    except Exception as e:
        print(f"Error {image_path}: {e}")

def main():
    # Пути к папкам
    dirs = [
        "public/boosters/",
        "public/orbs/basic/",
        "public/orbs/special/",
        "public/materials/"
    ]
    
    for d in dirs:
        if os.path.exists(d):
            print(f"Processing {d}...")
            for f in os.listdir(d):
                if f.endswith(".webp") and "orb_slot" not in f:
                    # Балансируем размеры
                    if "boosters" in d:
                        # Бустеры имеют календарики, их основной контент должен быть чуть меньше для компенсации
                        # Но чтобы они не казались мелкими, увеличиваем target
                        target = 110
                    elif "orbs" in d:
                        # Сферы круглые, они заполняют квадрат лучше
                        target = 115
                    else:
                        target = 115
                    normalize_icon(os.path.join(d, f), target_inner_size=target)

if __name__ == "__main__":
    main()
