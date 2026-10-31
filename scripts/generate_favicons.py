import os
import json
import cv2
import numpy as np
from PIL import Image

def build_svg_and_favicons():
    project_root = os.path.abspath(os.path.join(os.path.dirname(__file__), ".."))
    public_dir = os.path.join(project_root, "public")
    source_img_path = r"C:\Users\HQ Administrator\.gemini\antigravity\brain\fc573132-6d8d-4550-b06f-9eb28f426230\.user_uploaded\media_1793428784723_6474cb8a.jpg"

    if not os.path.exists(source_img_path):
        raise FileNotFoundError(f"Source image not found: {source_img_path}")

    print(f"Reading source brand image: {source_img_path}")
    im = Image.open(source_img_path).convert("RGB")
    arr = np.array(im)

    # Detect colored pixels vs background
    gray = cv2.cvtColor(arr, cv2.COLOR_RGB2GRAY)
    is_colored = (gray < 235).astype(np.uint8) * 255

    # Morphological close bridges the white divider stripes to obtain the unified external contour
    kernel = cv2.getStructuringElement(cv2.MORPH_ELLIPSE, (55, 55))
    closed = cv2.morphologyEx(is_colored, cv2.MORPH_CLOSE, kernel)
    contours, _ = cv2.findContours(closed, cv2.RETR_EXTERNAL, cv2.CHAIN_APPROX_TC89_KCOS)
    largest_outer = max(contours, key=cv2.contourArea)

    # Color distance helper
    def color_dist(img, target):
        diff = img[:, :, :3].astype(float) - np.array(target, dtype=float)
        return np.sqrt(np.sum(diff ** 2, axis=2))

    # Segment brand color regions
    # Carbon Green: #1B9A4A (27, 154, 74)
    # Carbon Blue:  #21409A (33, 64, 154)
    # Carbon Yellow: #E8CF2F (232, 207, 47)
    d_green = color_dist(arr, [27, 154, 74])
    d_blue = color_dist(arr, [33, 64, 154])
    d_yellow = color_dist(arr, [232, 207, 47])

    green_mask = (d_green < 70).astype(np.uint8)
    blue_mask = (d_blue < 70).astype(np.uint8)
    yellow_mask = (d_yellow < 70).astype(np.uint8)

    cnt_green = max(cv2.findContours(green_mask, cv2.RETR_EXTERNAL, cv2.CHAIN_APPROX_TC89_KCOS)[0], key=cv2.contourArea)
    cnt_blue = max(cv2.findContours(blue_mask, cv2.RETR_EXTERNAL, cv2.CHAIN_APPROX_TC89_KCOS)[0], key=cv2.contourArea)
    cnt_yellow = max(cv2.findContours(yellow_mask, cv2.RETR_EXTERNAL, cv2.CHAIN_APPROX_TC89_KCOS)[0], key=cv2.contourArea)

    def contour_to_svg_d(contour, epsilon_factor=0.0006):
        arc = cv2.arcLength(contour, True)
        approx = cv2.approxPolyDP(contour, epsilon_factor * arc, True)
        pts = approx.reshape(-1, 2)
        d = f"M {pts[0][0]} {pts[0][1]} "
        for pt in pts[1:]:
            d += f"L {pt[0]} {pt[1]} "
        d += "Z"
        return d

    outer_d = contour_to_svg_d(largest_outer, 0.0006)
    green_d = contour_to_svg_d(cnt_green, 0.0006)
    blue_d = contour_to_svg_d(cnt_blue, 0.0006)
    yellow_d = contour_to_svg_d(cnt_yellow, 0.0006)

    # 1. Write SVG Favicon
    svg_content = f'''<svg xmlns="http://www.w3.org/2000/svg" viewBox="50 50 900 900" width="100%" height="100%">
  <defs>
    <style>
      .carbon-base {{ fill: #FFFFFF; }}
      .carbon-green {{ fill: #1B9A4A; }}
      .carbon-blue {{ fill: #21409A; }}
      .carbon-yellow {{ fill: #E8CF2F; }}
    </style>
  </defs>
  <!-- Unified base silhouette in white guarantees crisp white stripes and maximum contrast on both light and dark browser tabs -->
  <path class="carbon-base" d="{outer_d}" />
  <!-- Carbon Brand Green Aerodynamic Wing -->
  <path class="carbon-green" d="{green_d}" />
  <!-- Carbon Brand Blue Directional Chevron -->
  <path class="carbon-blue" d="{blue_d}" />
  <!-- Carbon Brand Yellow Accent Curve -->
  <path class="carbon-yellow" d="{yellow_d}" />
</svg>
'''
    svg_path = os.path.join(public_dir, "favicon.svg")
    with open(svg_path, "w", encoding="utf-8") as f:
        f.write(svg_content)
    print(f"Saved vector SVG favicon: {svg_path}")

    # 2. Build High-Resolution Antialiased Master for Raster Icons
    mask = np.zeros((1000, 1000), dtype=np.uint8)
    cv2.drawContours(mask, [largest_outer], -1, 255, -1)
    mask_smooth = cv2.GaussianBlur(mask, (5, 5), 1.2)
    rgba = np.dstack([arr, mask_smooth])
    isolated_mark = Image.fromarray(rgba, "RGBA")

    bbox = isolated_mark.getbbox()
    cropped = isolated_mark.crop(bbox)
    cw, ch = cropped.size

    def make_square_icon(size: int, pad_px: int = None) -> Image.Image:
        if pad_px is None:
            pad_px = max(1, int(size * 0.04))
        available = size - (pad_px * 2)
        scale = available / max(cw, ch)
        nw = max(1, int(cw * scale))
        nh = max(1, int(ch * scale))
        rescaled = cropped.resize((nw, nh), Image.Resampling.LANCZOS)
        canvas = Image.new("RGBA", (size, size), (0, 0, 0, 0))
        canvas.paste(rescaled, ((size - nw) // 2, (size - nh) // 2), rescaled)
        return canvas

    icon_16 = make_square_icon(16, pad_px=1)
    icon_32 = make_square_icon(32, pad_px=2)
    icon_48 = make_square_icon(48, pad_px=3)
    icon_96 = make_square_icon(96, pad_px=4)
    icon_180 = make_square_icon(180, pad_px=8)
    icon_192 = make_square_icon(192, pad_px=8)
    icon_512 = make_square_icon(512, pad_px=20)

    # 3. Save multi-resolution ICO file (16x16, 32x32, 48x48)
    ico_path = os.path.join(public_dir, "favicon.ico")
    icon_48.save(
        ico_path,
        format="ICO",
        sizes=[(16, 16), (32, 32), (48, 48)],
        append_images=[icon_16, icon_32],
    )
    print(f"Saved multi-resolution ICO (16x16, 32x32, 48x48): {ico_path}")

    # 4. Save Standard PNG Favicons
    png_16_path = os.path.join(public_dir, "favicon-16x16.png")
    png_32_path = os.path.join(public_dir, "favicon-32x32.png")
    png_96_path = os.path.join(public_dir, "favicon-96x96.png")
    apple_path = os.path.join(public_dir, "apple-touch-icon.png")
    pwa_192_path = os.path.join(public_dir, "web-app-manifest-192x192.png")
    pwa_512_path = os.path.join(public_dir, "web-app-manifest-512x512.png")

    icon_16.save(png_16_path, "PNG")
    icon_32.save(png_32_path, "PNG")
    icon_96.save(png_96_path, "PNG")
    icon_180.save(apple_path, "PNG")
    icon_192.save(pwa_192_path, "PNG")
    icon_512.save(pwa_512_path, "PNG")

    print(f"Saved PNG icons: 16x16, 32x32, 96x96, Apple Touch 180x180, Manifest 192x192 & 512x512")

    # 5. Write site.webmanifest
    manifest_data = {
        "name": "Carbon Field Sales Tracker",
        "short_name": "Carbon Field Sales",
        "icons": [
            {
                "src": "/web-app-manifest-192x192.png",
                "sizes": "192x192",
                "type": "image/png",
                "purpose": "maskable"
            },
            {
                "src": "/web-app-manifest-512x512.png",
                "sizes": "512x512",
                "type": "image/png",
                "purpose": "maskable"
            }
        ],
        "theme_color": "#21409A",
        "background_color": "#ffffff",
        "display": "standalone"
    }
    manifest_path = os.path.join(public_dir, "site.webmanifest")
    with open(manifest_path, "w", encoding="utf-8") as f:
        json.dump(manifest_data, f, indent=2)
    print(f"Saved site.webmanifest: {manifest_path}")

if __name__ == "__main__":
    build_svg_and_favicons()
