#!/bin/bash

set -e

# Script for Generating Typescript bindings with zits

zits -i submodules/snapmail-rsm/zomes/snapmail -i submodules/snapmail-rsm/zomes/snapmail_model -o webcomponents/src/bindings/snapmail.ts
