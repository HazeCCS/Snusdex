#!/bin/sh
set -e

SRC="${SRC:-$HOME/Documents/SDX Solutions/Snusdex/Advertisment}"
WEB="$SRC/product-images/web"
SHOTS="$SRC/app-store-screenshots/raw"
ROOT="$(cd "$(dirname "$0")/.." && pwd)"
OUT="$ROOT/public/images"

mkdir -p "$OUT" "$ROOT/src/app"

conv() {
  cwebp -quiet -q "$4" -alpha_q 95 -m 6 -resize "$3" 0 "$1" -o "$OUT/$2.webp"
}

for entry in banana-blast:5 blue-raspberry:7 blueberry:1 cactus-lemon:7 ice-watermelon:8 menthol:2 spearmint:3 strawberry:4 wild-berries:10; do
  name="${entry%%:*}"
  strength="${entry##*:}"
  conv "$WEB/sorte-$name-strength-$strength-ohne-schatten.png" "can-$name" 640 84
  conv "$WEB/sorte-$name-top-ohne-schatten.png" "top-$name" 360 84
done

conv "$WEB/sammlung-dunkel.png" sammlung 2000 78
conv "$WEB/seltenheiten-dunkel.png" seltenheiten 2000 78
conv "$WEB/scan-szene-ohne-hand-dunkel.png" scan 2000 78

for name in look smell taste bite drip power; do
  conv "$WEB/bewertung-$name-ohne-schatten.png" "review-$name" 900 82
done

for name in home dex reviews stats friend badges profile; do
  conv "$SHOTS/$name.png" "app-$name" 660 82
done

conv "$SRC/app-store-header/v1-mit-logo/snusdex-icon-clean.png" logo 160 90

sips -s format png -z 512 512 "$SRC/app-store-header/v1-mit-logo/snusdex-icon-clean.png" --out "$ROOT/src/app/icon.png" >/dev/null
sips -s format png -z 180 180 "$SRC/app-store-header/v1-mit-logo/snusdex-icon-clean.png" --out "$ROOT/src/app/apple-icon.png" >/dev/null
cp "$WEB/og-produkt.png" "$ROOT/public/og.png"
