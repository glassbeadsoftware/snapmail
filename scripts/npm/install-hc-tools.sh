#!/bin/bash

rustc --version

# For ts-bindings
cargo install zits

### install `hc` cli tool
# use the version to match version holochain + hdk version used
# KEEP THIS IN SYNC
cargo install holochain_cli --version 0.0.60


### install wasm32 compilation target
#rustup install 1.61.0
#rustup override set 1.61.0

rustup target install wasm32-unknown-unknown
