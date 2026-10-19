#!/usr/bin/env bash
# Rebuild the bytemill WebAssembly bridge used by /bytemill.
#
# The site deploys the committed artifact in public/bytemill/bytemill.wasm.
# Run this after changing crates/bytemill-wasm (or any interpreter code it
# reaches), then commit the updated binary.
set -euo pipefail

ROOT="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
BYTEMILL_DIR="${BYTEMILL_DIR:-$ROOT/../protoc}"
TARGET="wasm32-unknown-unknown"
PROFILE="wasm-release"

if [[ ! -f "$BYTEMILL_DIR/Cargo.toml" ]]; then
  echo "bytemill checkout not found at $BYTEMILL_DIR" >&2
  echo "set BYTEMILL_DIR to the bytemill repository root" >&2
  exit 1
fi

cargo build \
  --manifest-path "$BYTEMILL_DIR/Cargo.toml" \
  --package bytemill-wasm \
  --profile "$PROFILE" \
  --target "$TARGET" \
  --locked

install -d "$ROOT/public/bytemill"
cp "$BYTEMILL_DIR/target/$TARGET/$PROFILE/bytemill_wasm.wasm" "$ROOT/public/bytemill/bytemill.wasm"
echo "wrote public/bytemill/bytemill.wasm"
