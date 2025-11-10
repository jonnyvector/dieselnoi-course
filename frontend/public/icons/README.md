# PWA Icons

To complete the PWA setup, you need to add app icons in the following sizes:

## Required Icons:
- icon-72x72.png
- icon-96x96.png
- icon-128x128.png
- icon-144x144.png
- icon-152x152.png
- icon-192x192.png
- icon-384x384.png
- icon-512x512.png

## Easy Way to Generate Icons:

### Option 1: Use an Online Tool
1. Go to https://realfavicongenerator.net/ or https://www.pwabuilder.com/imageGenerator
2. Upload your logo/brand image
3. Download the generated icons
4. Place them in this `/public/icons/` directory

### Option 2: Use ImageMagick (if installed)
```bash
# Create a base icon first (512x512) with your logo
# Then run these commands from the frontend directory:

convert public/icons/icon-512x512.png -resize 384x384 public/icons/icon-384x384.png
convert public/icons/icon-512x512.png -resize 192x192 public/icons/icon-192x192.png
convert public/icons/icon-512x512.png -resize 152x152 public/icons/icon-152x152.png
convert public/icons/icon-512x512.png -resize 144x144 public/icons/icon-144x144.png
convert public/icons/icon-512x512.png -resize 128x128 public/icons/icon-128x128.png
convert public/icons/icon-512x512.png -resize 96x96 public/icons/icon-96x96.png
convert public/icons/icon-512x512.png -resize 72x72 public/icons/icon-72x72.png
```

### Option 3: Create Simple Placeholder
For now, you can use a simple red square with "D" text as a placeholder.

## What the app looks like without icons:
The PWA will still work, but:
- Users won't see a nice icon on their home screen
- Install prompts will show a generic browser icon
- The app will still be installable and functional

## Recommended Icon Design:
- Use your brand colors (red #dc2626 for Dieselnoi)
- Include "Dieselnoi" or "D" monogram
- Make sure it's visible at small sizes (72x72)
- Use transparent background or solid color
- Keep design simple and recognizable
