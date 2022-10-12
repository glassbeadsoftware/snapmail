# Get binary file extension according to platform
fileext=".exe"

if [[ "$OSTYPE" == "linux-gnu"* ]]; then
        fileext=""
elif [[ "$OSTYPE" == "darwin"* ]]; then
        fileext=""
fi

binary=./submodules/hash_zome$fileext

# Check if tool needs to be installed
if [ ! -f $binary ] ; then
  echo $binary not found. Installing...
  ./scripts/npm/install-hash-zome.sh
fi

# Compute hash of the zome
value=`$binary ./submodules/snapmail-rsm/target/wasm32-unknown-unknown/release/snapmail_model.wasm`
if [ "$value" == "" ]
then
  echo hash_zome failed
  exit 1
fi
echo "$value" > electron/bin/model_zome_hash.txt
echo
echo "SNAPMAIL MODEL ZOME HASH = $value"
