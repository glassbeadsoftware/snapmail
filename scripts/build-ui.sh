#!/bin/sh
echo
echo Building Snapmail UI

# Check pre-conditions
if [ $# != 1 ]; then
  echo 1>&2 "$0: Aborting. Missing argument ('dev' or 'prod')"
  exit 2
fi

# Generate Web UI
cd ui/lib
npm run $1
cp -r dist/* ../../electron-ui
cd ..

# Done
cd ..
