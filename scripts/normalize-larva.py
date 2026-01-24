import os
from PIL import Image

def normalize_icon(image_path, canvas_size=(128, 128), padding_percent=0.02):
    try:
        with Image.open(image_path) as img:
            img = img.convert("RGBA")
            bbox = img.getbbox()
            if not bbox: return
            img_trimmed = img.crop(bbox)
            w, h = img_trimmed.size
            ratio = min(canvas_size[0] * (1.0 - padding_percent * 2) / w, 
                        canvas_size[1] * (1.0 - padding_percent * 2) / h)
            new_w, new_h = int(w * ratio), int(h * ratio)
            img_resized = img_trimmed.resize((new_w, new_h), Image.Resampling.LANCZOS)
            final_canvas = Image.new("RGBA", canvas_size, (0, 0, 0, 0))
            offset = ((canvas_size[0] - new_w) // 2, (canvas_size[1] - new_h) // 2)
            final_canvas.paste(img_resized, offset)
            final_canvas.save(image_path, "WEBP")
            print(f"Normalized {image_path}: {w}x{h} -> {new_w}x{new_h} on {canvas_size[0]}x{canvas_size[1]}")
    except Exception as e:
        print(f"Error processing {image_path}: {e}")

if __name__ == "__main__":
    normalize_icon("public/etc/icon_larva.webp")
