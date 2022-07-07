# Compute hash of the zome
value=`./submodules/hash_zome$fileext ./submodules/snapmail-rsm/target/wasm32-unknown-unknown/release/snapmail.wasm`
echo "$value" > bin/zome_hash.txt
echo
echo "SNAPMAIL ZOME HASH = $value"
