# Compute hash of where zome
value=`./hash_zome ./target/wasm32-unknown-unknown/release/snapmail.wasm`
echo "$value" > electron/binaries/zome_hash.txt
echo
echo "SNAPMAIL ZOME HASH = $value"
