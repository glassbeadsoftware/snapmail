#!/bin/bash
set -e

# Script for copying holochain-runner binary to electron bin folder (used for distributing electron app)

echo Executing \"$0\".

# Check pre-conditions
if [ $# != 1 ]; then
  echo 1>&2 "$0: Aborting. Missing argument: bin folder path"
  exit 2
fi

# Compile the WASM
cargo build --release --target wasm32-unknown-unknown --manifest-path submodules/snapmail-rsm/Cargo.toml

# Pack DNAs
mkdir -p artifacts
$1/hc dna pack submodules/snapmail-rsm/workdir -o submodules/snapmail-rsm/workdir/snapmail.dna
$1/hc app pack submodules/snapmail-rsm/workdir -o submodules/snapmail-rsm/workdir/snapmail.happ
cp submodules/snapmail-rsm/workdir/snapmail.dna artifacts/snapmail.dna
cp submodules/snapmail-rsm/workdir/snapmail.happ artifacts/snapmail.happ
cp artifacts/snapmail.happ electron/bin/snapmail.happ
