#!/bin/bash

# TOP LEVEL
#rm -rf bin/*
#rm -rf submodules
rm .hc_live*
rm -rf out-builder
rm -rf node_modules
rm package-lock.json
# UI LIB
rm -rf ui/lib/dist
rm -rf ui/lib/node_modules
rm ui/lib/package-lock.json
# ELECTRON
rm -rf electron/out-tsc
rm -rf electron/node_modules
rm electron/package-lock.json
# WE APPLET
rm -rf we-applet/out-tsc
rm -rf we-applet/node_modules
rm we-applet/package-lock.json
rm we-applet/.hc_live*
# WE APPLET
rm -rf ui/apps/snapmail/dist
rm -rf ui/apps/snapmail/out-tsc
rm -rf ui/apps/snapmail/node_modules
rm ui/apps/snapmail/package-lock.json
rm ui/apps/snapmail/ui.zip
