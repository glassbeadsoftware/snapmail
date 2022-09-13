#!/bin/sh

# Script for updating version number across the code base

# Check pre-conditions
if [ $# != 1 ]; then
  echo 1>&2 "$0: Aborting. Missing argument: new version number"
  exit 2
fi

# Change TOP package.json
OLD_VER=`awk -F ":" '/"version"/ {print $2}' package.json | sed 's/"//g' | sed 's/,//g' | sed 's/ //g'`
sed -i "s/\"version\": \"$OLD_VER\"/\"version\": \"$1\"/" package.json


echo
echo "Updating version number '$OLD_VER' -> '$1'"
echo

# Change electron/package.json
OLD_VER=`awk -F ":" '/"version"/ {print $2}' ./electron/package.json | sed 's/"//g' | sed 's/,//g' | sed 's/ //g'`
sed -i "s/\"version\": \"$OLD_VER\"/\"version\": \"$1\"/" ./electron/package.json

# Change we-applet/package.json
OLD_VER=`awk -F ":" '/"version"/ {print $2}' ./we-applet/package.json | sed 's/"//g' | sed 's/,//g' | sed 's/ //g'`
sed -i "s/\"version\": \"$OLD_VER\"/\"version\": \"$1\"/" ./we-applet/package.json

# Change webcomponents/package.json
OLD_VER=`awk -F ":" '/"version"/ {print $2}' ./webcomponents/package.json | sed 's/"//g' | sed 's/,//g' | sed 's/ //g'`
sed -i "s/\"version\": \"$OLD_VER\"/\"version\": \"$1\"/" ./webcomponents/package.json

# Change webapp/package.json
OLD_VER=`awk -F ":" '/"version"/ {print $2}' ./webapp/package.json | sed 's/"//g' | sed 's/,//g' | sed 's/ //g'`
sed -i "s/\"version\": \"$OLD_VER\"/\"version\": \"$1\"/" ./webapp/package.json

# Change .github/workflows/release.yml
OLD_VER=`awk -F ":" '/SNAPMAIL_VERSION/ {print $2}' ./.github/workflows/release.yml | sed 's/ //g'
sed -i "s/$OLD_VER/$1/" ./.github/workflows/release.yml
