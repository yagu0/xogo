# xogo.casa

Simplified version of old vchess.club, to focus on the essential : the game.

## Requirements (dev)

PHP + Node.js + npm.
```npm i -g nodemon```

## Usage

```wget https://xogo.live/assets.zip && unzip assets.zip``` <br/>
Rename parameters.js.dist &rarr; parameters.js, and edit file. <br/>
```npm i```

Generate some pieces: <br/>
```python generateSVG.py``` in variants/Avalam/pieces

```./start.sh``` (and later, ```./stop.sh```)
