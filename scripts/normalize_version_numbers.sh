#!/bin/sh

# Script for normalizing version numbers
# Build script must be called first

NEW_VER=`awk -F ":" '/"version"/ {print $2}' snapmail-ui/package.json | sed 's/"//g' | sed 's/,//g' | sed 's/ //g'`

OLD_VER=`awk -F ":" '/"version"/ {print $2}' ../package.json | sed 's/"//g' | sed 's/,//g' | sed 's/ //g'`

echo "OLD REV = '$OLD_VER'"
echo "NEW REV = '$NEW_VER'"

sed -i "s/$OLD_VER/$NEW_VER/" ../package.json
