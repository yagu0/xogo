!#/bin/sh

wget https://xogo.live/assets.zip && unzip assets.zip
wget https://xogo.live/extras.zip && unzip extras.zip
cp parameters.js.dist parameters.js
npm i
cd pieces/Avalam && python generateSVG.py
#cd pieces/Emergo && python generateSVG.py
