#!/bin/bash

# Good practice -- exit completely on any bad exit code:
set -e

npm install
cp -r ntypescript node_modules/
cd node_modules/ntypescript
if [ ! -d ConcreteTypeScript ] ; then
    git clone --depth 1 ssh://git@bitbucket.org/ludamad/ConcreteTypeScript1.6 ConcreteTypeScript
else
    cd ConcreteTypeScript/
    git pull
    cd ..
fi

./prepare.sh
