#!/bin/sh
set -e

CURR_DIR=`pwd`
#git submodule update --recursive --init

# Official Microsoft/TypeScript clone
cd ./ConcreteTypeScript

#git clean -xfd
#git fetch origin
#git reset --hard origin/master

# Fix jakefile to expose the internal APIs to service
#< Jakefile.js > Jakefile.new.js sed -E "s/\*stripInternal\*\/ true/\*stripInternal\*\/ false/"
#mv Jakefile.new.js Jakefile.js

# Install jake and everything else
#npm install

# Build once to get a new LKG
jake
cp ./built/local/* ./bin/

# Copy the source TypeScript compiler and services, but not the tsconfig.json files
cp -r ./src/compiler/* "$CURR_DIR/src/compiler"
cp -r ./src/services/* "$CURR_DIR/src/services"
rm -f "$CURR_DIR/src/services/tsconfig.json" "$CURR_DIR/src/compiler/tsconfig.json"

# Do pre build modifications
node "$CURR_DIR/extensions/preBuild.js"

# Now build using the LKG
./bin/tsc -p "$CURR_DIR/src"
./bin/tsc -p "$CURR_DIR/extensions"

# Also copy the lib.* stuff from LKG
cp -r ./bin/* "$CURR_DIR/bin"

# add custom extension
node "$CURR_DIR/extensions/addExtensions.js"

# Reset sub typescript
#$git reset --hard origin/master
cd "$CURR_DIR"
