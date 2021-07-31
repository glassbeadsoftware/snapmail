#!/bin/sh
# Script for building Snapmail DNA and UI

cd build

# Generate Web UI
cd snapmail-ui
npm run $1
cp -r dist/* ../../ui
cd ..

## Done
cd ..
