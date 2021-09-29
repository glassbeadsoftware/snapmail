#!/bin/sh

# DEPRECATED SCRIPT

cd dna
curl -s https://api.github.com/repos/glassbeadsoftware/snapmail-rsm/releases/latest | grep "browser_download_url.*dna" | cut -d '"' -f 4 | wget -qi -
cd ..
