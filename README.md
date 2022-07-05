# xogo.live

Simplified version of old vchess.club, to focus on the essential : the game.

## Requirements (dev)

Global npm install: nodemon, livereload. <br>
A static web server like "php -S localhost:8000".

## Usage

```wget https://xogo.live/assets.zip && unzip assets.zip``` <br>
Rename parameters.js.dist &rarr; parameters.js, and edit file. <br>
```npm i```

Generate some pieces: <br>
```python generateSVG.py``` in pieces/Avalam

```./start.sh``` (edit 'php -S ...' line if necessary) <br>
... <br>
```./stop.sh```
