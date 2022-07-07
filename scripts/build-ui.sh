#!/bin/sh
echo
echo Building Snapmail UI

# Check pre-conditions
if [ $# != 1 ]; then
  echo 1>&2 "$0: Aborting. Missing argument ('dev' or 'prod')"
  exit 2
fi

if ! test -d "./submodules"; then
    echo "$0: Aborting. Missing './submodules' folder."
    exit 1
fi
if ! test -d "./submodules/snapmail-ui"; then
    echo "$0: Aborting. Missing './submodules/snapmail-ui' folder."
    exit 1
fi

# Start
cd submodules

# Generate Web UI
cd snapmail-ui
npm run $1
cp -r dist/* ../../electron-ui
cd ..

# Done
cd ..
