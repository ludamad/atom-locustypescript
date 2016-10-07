#!/bin/bash
set -e

npm install
cp -r ntypescript node_modules/
cd node_modules/ntypescript
if [ ! -d ConcreteTypeScript ] ; then
    git clone --depth 1 https://github.com/ludamad/LocusTypeScript ConcreteTypeScript
else
    cd ConcreteTypeScript/
    git pull
    cd ..
fi

./prepare.sh
cd ../..
apm link
