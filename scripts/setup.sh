#!/bin/sh
# Script for setting up dev environment

npm install

# Create build Directory
rm -r build
mkdir build
cd build

# Generate Web UI
git clone https://github.com/glassbeadsoftware/snapmail-ui
cd snapmail-ui
npm install
cd ..

cd ..

# Generate DNA
#git clone https://github.com/glassbeadsoftware/snapmail-rsm
bash ./scripts/download_dna.sh
