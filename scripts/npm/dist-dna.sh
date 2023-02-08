#!/bin/bash
set -e
# Compile the WASM
cargo build --release --target wasm32-unknown-unknown --manifest-path submodules/snapmail-rsm/Cargo.toml
# Pack DNAs
mkdir -p artifacts
./bin/hc dna pack submodules/snapmail-rsm/workdir -o submodules/snapmail-rsm/workdir/snapmail.dna
./bin/hc app pack submodules/snapmail-rsm/workdir -o submodules/snapmail-rsm/workdir/snapmail.happ
cp submodules/snapmail-rsm/workdir/snapmail.dna artifacts/snapmail.dna
cp submodules/snapmail-rsm/workdir/snapmail.happ artifacts/snapmail.happ
cp artifacts/snapmail.happ electron/bin/snapmail.happ
