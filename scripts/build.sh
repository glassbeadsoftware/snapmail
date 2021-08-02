#!/bin/sh
echo
echo Building Snapmail UI

# Check pre-conditions
if [ $# != 1 ]; then
  echo 1>&2 "$0: Aborting. Missing argument ('dev' or 'prod')"
  exit 2
fi

if ! test -d "./build"; then
    echo "$0: Aborting. Missing './build' folder."
    exit 1
fi
if ! test -d "./build/snapmail-ui"; then
    echo "$0: Aborting. Missing './build/snapmail-ui' folder."
    exit 1
fi

# Start
cd build

# Generate Web UI
cd snapmail-ui
npm run $1
cp -r dist/* ../../ui
cd ..

# Done
cd ..
