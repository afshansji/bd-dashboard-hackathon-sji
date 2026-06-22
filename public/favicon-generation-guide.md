# Favicon Generation Guide

## Current Setup

The website now uses `bd-logo.svg` as the favicon, which displays the BD logo with a gradient background (blue to teal to green).

## SVG Favicon

**File:** `/bd-logo.svg`
- Vector format (scales perfectly at any size)
- Gradient background (blue → teal → green)
- White "BD" text
- Works in modern browsers

## For Better Browser Compatibility

If you need PNG versions for older browsers, you can generate them from the SVG:

### Recommended Sizes:
- **16x16** - Standard favicon
- **32x32** - Standard favicon
- **48x48** - Windows site icons
- **180x180** - Apple touch icon
- **192x192** - Android Chrome
- **512x512** - High-resolution

### How to Generate PNG Files:

**Option 1: Online Tool**
1. Go to https://realfavicongenerator.net/
2. Upload `bd-logo.svg`
3. Download generated favicon package
4. Place files in `/public` folder

**Option 2: Using ImageMagick (Command Line)**
```bash
# Install ImageMagick first
# Then run:
magick bd-logo.svg -resize 16x16 favicon-16x16.png
magick bd-logo.svg -resize 32x32 favicon-32x32.png
magick bd-logo.svg -resize 180x180 apple-touch-icon.png
magick bd-logo.svg -resize 192x192 android-chrome-192x192.png
magick bd-logo.svg -resize 512x512 android-chrome-512x512.png
```

**Option 3: Using Online SVG to PNG Converter**
1. Go to https://svgtopng.com/
2. Upload `bd-logo.svg`
3. Generate different sizes
4. Download and place in `/public` folder

### Update index.html with PNG versions:

```html
<link rel="icon" type="image/png" sizes="32x32" href="/favicon-32x32.png">
<link rel="icon" type="image/png" sizes="16x16" href="/favicon-16x16.png">
<link rel="apple-touch-icon" sizes="180x180" href="/apple-touch-icon.png">
<link rel="manifest" href="/site.webmanifest">
```

## Current Implementation

The SVG favicon is already set up and will work in all modern browsers. No additional action needed unless you want to support older browsers.









