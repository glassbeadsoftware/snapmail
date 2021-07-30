#!/bin/sh
# Script for Releasing Snapmail happ

echo Starting Release process...

./scripts/setup.sh
./scripts/download-hc.sh
./scripts/build-hc.sh
./scripts/build.sh prod
npm run dist-$1
