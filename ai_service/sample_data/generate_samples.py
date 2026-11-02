"""
generate_samples.py
Creates realistic sample clothing images with real pixel data, distinct colors,
and geometric patterns (Plain, Striped, Checked, Printed, Floral) across 10+ categories:
- Shirt, T-shirt, Jeans, Trousers, Dress, Jacket, Hoodie, Sweater, Shoes, Sneakers.
Used for independent testing and accuracy calculation without external internet dependencies.
"""

import os
from PIL import Image, ImageDraw

def create_sample_images(output_dir: str):
    os.makedirs(output_dir, exist_ok=True)

    # 1. Navy Striped T-Shirt (T-shirt, Navy Blue, Striped)
    img1 = Image.new("RGB", (300, 300), color=(235, 238, 240))
    draw1 = ImageDraw.Draw(img1)
    torso_coords = [
        (90, 60), (130, 80), (170, 80), (210, 60),
        (260, 110), (225, 145), (200, 120),
        (200, 260), (100, 260), (100, 120),
        (75, 145), (40, 110)
    ]
    draw1.polygon(torso_coords, fill=(24, 43, 73))  # Navy Blue #182B49
    # Repeating horizontal white stripes across torso
    for y in range(95, 255, 22):
        draw1.rectangle([100, y, 200, y + 9], fill=(250, 250, 255))
    img1.save(os.path.join(output_dir, "navy_striped_tshirt.jpg"))

    # 2. Dark Indigo Jeans (Jeans, Blue / Indigo, Plain)
    img2 = Image.new("RGB", (300, 300), color=(240, 242, 245))
    draw2 = ImageDraw.Draw(img2)
    jeans_coords = [
        (85, 40), (215, 40),
        (220, 275), (170, 275),
        (150, 130),
        (130, 275), (80, 275)
    ]
    draw2.polygon(jeans_coords, fill=(26, 43, 76))  # Dark Indigo Blue
    # Waistband and pocket details
    draw2.line([(85, 60), (215, 60)], fill=(20, 30, 55), width=2)
    draw2.arc([95, 70, 135, 110], start=0, end=90, fill=(180, 130, 70), width=2)
    draw2.arc([165, 70, 205, 110], start=90, end=180, fill=(180, 130, 70), width=2)
    img2.save(os.path.join(output_dir, "indigo_jeans.jpg"))

    # 3. Classic White Shirt (Shirt, White, Plain)
    img3 = Image.new("RGB", (300, 300), color=(220, 225, 230))
    draw3 = ImageDraw.Draw(img3)
    shirt_coords = [
        (100, 50), (130, 70), (170, 70), (200, 50),
        (255, 110), (225, 140), (195, 120),
        (195, 260), (105, 260), (105, 120),
        (75, 140), (45, 110)
    ]
    draw3.polygon(shirt_coords, fill=(255, 255, 255))
    # Collar & buttons
    draw3.polygon([(130, 70), (150, 95), (170, 70), (150, 78)], fill=(240, 240, 240), outline=(200, 200, 200))
    draw3.line([(150, 95), (150, 260)], fill=(205, 205, 205), width=2)
    for y in range(110, 250, 30):
        draw3.ellipse([148, y, 152, y + 4], fill=(160, 160, 160))
    img3.save(os.path.join(output_dir, "white_shirt.jpg"))

    # 4. Burgundy Sweater (Sweater, Burgundy / Red, Plain)
    img4 = Image.new("RGB", (300, 300), color=(245, 245, 245))
    draw4 = ImageDraw.Draw(img4)
    sweater_coords = [
        (105, 55), (140, 65), (160, 65), (195, 55),
        (260, 120), (230, 155), (200, 130),
        (200, 260), (100, 260), (100, 130),
        (70, 155), (40, 120)
    ]
    draw4.polygon(sweater_coords, fill=(128, 0, 32))  # Burgundy Red #800020
    draw4.rectangle([135, 55, 165, 70], fill=(110, 0, 25), outline=(90, 0, 20))
    img4.save(os.path.join(output_dir, "burgundy_sweater.jpg"))

    # 5. Emerald Green Dress (Dress, Emerald Green, Plain)
    img5 = Image.new("RGB", (300, 300), color=(245, 245, 245))
    draw5 = ImageDraw.Draw(img5)
    dress_coords = [
        (125, 45), (175, 45),
        (185, 110), (165, 130),
        (230, 275), (70, 275),
        (135, 130), (115, 110)
    ]
    draw5.polygon(dress_coords, fill=(4, 99, 7))  # Emerald Green
    img5.save(os.path.join(output_dir, "emerald_dress.jpg"))

    # 6. Brown Leather Oxford Shoes (Shoes, Brown, Plain)
    img6 = Image.new("RGB", (300, 300), color=(245, 245, 245))
    draw6 = ImageDraw.Draw(img6)
    shoe_coords = [
        (50, 180), (110, 140), (180, 140), (250, 175),
        (265, 205), (265, 225), (45, 225), (45, 195)
    ]
    draw6.polygon(shoe_coords, fill=(101, 67, 33))  # Brown
    draw6.rectangle([45, 215, 95, 230], fill=(50, 30, 15))  # Heel
    draw6.line([(45, 225), (265, 225)], fill=(40, 20, 10), width=3)  # Sole
    img6.save(os.path.join(output_dir, "brown_oxfords.jpg"))

    # 7. Black Formal Trousers (Trousers, Black, Plain)
    img7 = Image.new("RGB", (300, 300), color=(240, 240, 240))
    draw7 = ImageDraw.Draw(img7)
    trousers_coords = [
        (90, 40), (210, 40),
        (215, 275), (170, 275),
        (150, 125),
        (130, 275), (85, 275)
    ]
    draw7.polygon(trousers_coords, fill=(20, 20, 20))  # Black #141414
    # Crease lines down legs
    draw7.line([(105, 70), (105, 275)], fill=(40, 40, 40), width=1)
    draw7.line([(195, 70), (195, 275)], fill=(40, 40, 40), width=1)
    img7.save(os.path.join(output_dir, "black_trousers.jpg"))

    # 8. Charcoal Suit Jacket (Jacket, Grey / Charcoal, Plain)
    img8 = Image.new("RGB", (300, 300), color=(245, 245, 245))
    draw8 = ImageDraw.Draw(img8)
    jacket_coords = [
        (95, 45), (135, 65), (165, 65), (205, 45),
        (265, 115), (235, 145), (205, 125),
        (205, 255), (95, 255), (95, 125),
        (65, 145), (35, 115)
    ]
    draw8.polygon(jacket_coords, fill=(65, 65, 70))  # Charcoal Grey
    # Lapel V-cut and button
    draw8.polygon([(135, 65), (150, 140), (165, 65)], fill=(220, 220, 225))
    draw8.polygon([(120, 75), (148, 140), (135, 65)], fill=(55, 55, 60))
    draw8.polygon([(180, 75), (152, 140), (165, 65)], fill=(55, 55, 60))
    draw8.ellipse([148, 175, 152, 179], fill=(30, 30, 35))
    # Pockets
    draw8.line([(105, 205), (130, 205)], fill=(45, 45, 50), width=2)
    draw8.line([(170, 205), (195, 205)], fill=(45, 45, 50), width=2)
    img8.save(os.path.join(output_dir, "charcoal_jacket.jpg"))

    # 9. Grey Fleece Hoodie (Hoodie, Grey, Plain)
    img9 = Image.new("RGB", (300, 300), color=(245, 245, 245))
    draw9 = ImageDraw.Draw(img9)
    # Hood outline at top
    draw9.polygon([(120, 30), (150, 20), (180, 30), (195, 60), (105, 60)], fill=(125, 125, 130))
    hoodie_coords = [
        (100, 60), (135, 70), (165, 70), (200, 60),
        (260, 120), (230, 155), (200, 130),
        (200, 260), (100, 260), (100, 130),
        (70, 155), (40, 120)
    ]
    draw9.polygon(hoodie_coords, fill=(135, 135, 140))  # Medium Grey
    # Kangaroo front pocket
    draw9.polygon([(120, 185), (180, 185), (190, 230), (110, 230)], fill=(115, 115, 120))
    img9.save(os.path.join(output_dir, "grey_hoodie.jpg"))

    # 10. Red Checked Flannel Shirt (Shirt, Red, Checked)
    img10 = Image.new("RGB", (300, 300), color=(240, 242, 245))
    draw10 = ImageDraw.Draw(img10)
    draw10.polygon(shirt_coords, fill=(190, 30, 30))  # Base Red
    # Collar
    draw10.polygon([(130, 70), (150, 95), (170, 70), (150, 78)], fill=(150, 20, 20))
    # Grid intersecting plaid lines (Checked)
    for y in range(90, 255, 18):
        draw10.rectangle([105, y, 195, y + 4], fill=(25, 25, 25))
    for x in range(115, 190, 18):
        draw10.rectangle([x, 80, x + 4, 260], fill=(25, 25, 25))
    img10.save(os.path.join(output_dir, "red_checked_shirt.jpg"))

    # 11. Black Graphic Printed Tee (T-shirt, Black, Printed)
    img11 = Image.new("RGB", (300, 300), color=(245, 245, 245))
    draw11 = ImageDraw.Draw(img11)
    tee_coords = [
        (90, 60), (130, 78), (170, 78), (210, 60),
        (260, 110), (225, 145), (200, 120),
        (200, 260), (100, 260), (100, 120),
        (75, 145), (40, 110)
    ]
    draw11.polygon(tee_coords, fill=(20, 20, 20))  # Black base
    # Bold multi-color graphic artwork in center (Printed)
    draw11.ellipse([125, 125, 175, 175], fill=(240, 180, 20))
    draw11.polygon([(135, 160), (150, 130), (165, 160)], fill=(220, 30, 30))
    draw11.rectangle([130, 185, 170, 192], fill=(245, 245, 250))
    img11.save(os.path.join(output_dir, "black_graphic_tee.jpg"))

    # 12. Pink Floral Summer Dress (Dress, Pink, Floral)
    img12 = Image.new("RGB", (300, 300), color=(245, 245, 245))
    draw12 = ImageDraw.Draw(img12)
    draw12.polygon(dress_coords, fill=(240, 130, 160))  # Pink base
    # Scattered organic floral blossoms
    flower_centers = [
        (140, 150), (160, 170), (120, 200), (180, 210), (145, 230), (170, 250), (110, 255)
    ]
    for cx, cy in flower_centers:
        for angle_offset in [(-5, -5), (5, -5), (-5, 5), (5, 5)]:
            draw12.ellipse([cx + angle_offset[0] - 4, cy + angle_offset[1] - 4,
                            cx + angle_offset[0] + 4, cy + angle_offset[1] + 4], fill=(255, 255, 255))
        draw12.ellipse([cx - 3, cy - 3, cx + 3, cy + 3], fill=(240, 200, 40))  # Yellow flower center
    img12.save(os.path.join(output_dir, "floral_dress.jpg"))

    # 13. White Minimalist Sneakers (Sneakers, White, Plain)
    img13 = Image.new("RGB", (300, 300), color=(225, 230, 235))
    draw13 = ImageDraw.Draw(img13)
    sneaker_coords = [
        (50, 185), (105, 160), (175, 160), (250, 185),
        (265, 215), (265, 235), (45, 235), (45, 205)
    ]
    draw13.polygon(sneaker_coords, fill=(255, 255, 255))
    draw13.rectangle([45, 222, 265, 235], fill=(230, 230, 230))  # Flat rubber sneaker sole
    # Laces
    for lx in range(120, 170, 10):
        draw13.line([(lx, 165), (lx + 6, 178)], fill=(180, 180, 180), width=2)
    img13.save(os.path.join(output_dir, "white_sneakers.jpg"))

    print(f"Successfully generated 13 test clothing images in {output_dir}")

if __name__ == "__main__":
    out_path = os.path.join(os.path.dirname(__file__), "images")
    create_sample_images(out_path)
