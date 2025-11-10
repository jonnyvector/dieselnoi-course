#!/bin/bash

# Simple script to generate placeholder PWA icons
# Creates red squares with white "D" text

cd "$(dirname "$0")"

# Check if ImageMagick is installed
if ! command -v convert &> /dev/null; then
    echo "ImageMagick not found. Please install it first:"
    echo "  Mac: brew install imagemagick"
    echo "  Ubuntu: sudo apt-get install imagemagick"
    echo ""
    echo "Or use an online tool like https://realfavicongenerator.net/"
    exit 1
fi

echo "Generating placeholder PWA icons..."

mkdir -p public/icons

# Create base 512x512 icon with red background and white "D"
convert -size 512x512 xc:"#dc2626" \
    -gravity center \
    -pointsize 320 \
    -font "Arial-Bold" \
    -fill white \
    -annotate +0+0 "D" \
    public/icons/icon-512x512.png

echo "✓ Created 512x512 icon"

# Generate other sizes
sizes=(384 192 152 144 128 96 72)
for size in "${sizes[@]}"; do
    convert public/icons/icon-512x512.png -resize ${size}x${size} public/icons/icon-${size}x${size}.png
    echo "✓ Created ${size}x${size} icon"
done

echo ""
echo "✅ All icons generated successfully!"
echo "Icons are in: public/icons/"
echo ""
echo "Note: These are placeholder icons. Consider creating a custom logo for production."
