#!/usr/bin/env bash
set -euo pipefail

ROOT="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
VERSION="${1:-v0.11.0-preview}"
DESTINATION="${2:-$ROOT/release}"
if [[ "$DESTINATION" != /* ]]; then
  DESTINATION="$ROOT/$DESTINATION"
fi
ARCHIVE="$DESTINATION/Last-Commit-${VERSION}.zip"
CHECKSUM="$ARCHIVE.sha256"
STAGE="$(mktemp -d)"

cleanup() {
  rm -rf "$STAGE"
}
trap cleanup EXIT

mkdir -p "$DESTINATION"
mkdir -p "$STAGE/assets/pixel-cat/theme-v12.1"
mkdir -p "$STAGE/assets/pixel-cat/video-v2"
mkdir -p "$STAGE/assets/copyright-butterfly"
mkdir -p "$STAGE/scripts"

cp "$ROOT/index.html" "$STAGE/"
cp "$ROOT/vercel.json" "$STAGE/"
cp "$ROOT/Last Commit·早睡作息系统.html" "$STAGE/"
cp "$ROOT/README.md" "$STAGE/"
cp "$ROOT/LICENSE" "$STAGE/"
cp "$ROOT/ASSET-LICENSE.md" "$STAGE/"
cp "$ROOT/NOTICE.md" "$STAGE/"
cp "$ROOT/asset-license.html" "$STAGE/"
cp "$ROOT/notice.html" "$STAGE/"
cp "$ROOT/PUBLIC_REFERENCES.md" "$STAGE/"
cp "$ROOT/CONTRIBUTING.md" "$STAGE/"
cp "$ROOT/scripts/build-public-release.sh" "$STAGE/scripts/"

for file in \
  last-commit-v12.8.css \
  last-commit-v12.9.css \
  last-commit-v12.10.css \
  last-commit-v12.11.css \
  last-commit-v12.12.css \
  last-commit-v12.13.css \
  last-commit-v12.14.css \
  last-commit-v12.15.css \
  last-commit-v12.16.css \
  last-commit-v12.18.css \
  last-commit-v12.19.css \
  last-commit-v12.20.css \
  last-commit-v12.21.css \
  last-commit-v12.22.css \
  last-commit-v12.24.css \
  last-commit-v12.25.css \
  legal-v1.css \
  last-commit-v12.15.js \
  last-commit-v12.20.js \
  last-commit-v12.21.js \
  last-commit-v12.22.js \
  last-commit-v12.24.js \
  last-commit-v12.25.js
do
  cp "$ROOT/assets/$file" "$STAGE/assets/"
done

cp "$ROOT/assets/pixel-cat/video-v2/"*.webm \
  "$STAGE/assets/pixel-cat/video-v2/"

for file in \
  C01-poster.png \
  C02-poster.png \
  C03-poster.png \
  C04-poster.png \
  C05-poster.png \
  C06-poster.png \
  C07-poster.png \
  C08-poster.png \
  C08-hold.png \
  video-idle-native-v12.28.png
do
  cp "$ROOT/assets/pixel-cat/video-v2/$file" \
    "$STAGE/assets/pixel-cat/video-v2/"
done

cp "$ROOT/assets/copyright-butterfly/handdrawn-butterfly-v1.png" \
  "$STAGE/assets/copyright-butterfly/"
cp "$ROOT/assets/copyright-butterfly/handdrawn-butterfly-v2.png" \
  "$STAGE/assets/copyright-butterfly/"

for file in \
  pixel-cat-tide-v12.1.png \
  pixel-cat-paper-v12.1.png \
  pixel-cat-plum-v12.1.png \
  pixel-cat-dawn-v12.1.png
do
  cp "$ROOT/assets/pixel-cat/theme-v12.1/$file" "$STAGE/assets/pixel-cat/theme-v12.1/"
done

rm -f "$ARCHIVE" "$CHECKSUM"
(
  cd "$STAGE"
  bsdtar -a -cf "$ARCHIVE" .
)
(
  cd "$DESTINATION"
  shasum -a 256 "$(basename "$ARCHIVE")" > "$(basename "$CHECKSUM")"
)

echo "$ARCHIVE"
echo "$CHECKSUM"
