#!/bin/bash

# install wasm32 compilation target
rustup target install wasm32-unknown-unknown

# install `hc` cli tool
# use the version to match version holochain + hdk version used
# KEEP THIS IN SYNC
cargo install holochain_cli --version 0.0.25
