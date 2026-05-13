#!/bin/sh

wget https://xogo.casa/assets.zip && unzip assets.zip
wget https://xogo.casa/extras.zip && unzip extras.zip
cp js/parameters.js.dist js/parameters.js
npm i
cd pieces/Avalam && python generateSVG.py && cd ../..
cd pieces/Emergo && python generateSVG.py && cd ../..
