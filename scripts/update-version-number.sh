#!/bin/sh

# Script for updating electron ui and web ui version number
# Setup script must be called first

# Check pre-conditions
if [ $# != 1 ]; then
  echo 1>&2 "$0: Aborting. Missing argument: new version number"
  exit 2
fi

OLD_VER=`awk -F ":" '/"version"/ {print $2}' package.json | sed 's/"//g' | sed 's/,//g' | sed 's/ //g'`

echo
echo "Updating version number '$OLD_VER' -> '$1'"
echo

sed -i "s/\"version\": \"$OLD_VER\"/\"version\": \"$1\"/" package.json
sed -i "s/\"version\": \"$OLD_VER\"/\"version\": \"$1\"/" ./build/snapmail-ui/package.json
