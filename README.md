# xogo.casa

Simplified version of old vchess.club, to focus on the essential : the game.

## Requirements (dev)

PHP + Node.js + npm.
```npm i -g nodemon```

## Usage

Initialisation (done once): retrieve 'binaries'
(files binary or not which never change).

```./initialize.sh```

Rename and edit the parameters.js.dist file:

```cp js/parameters.js.dist js/parameters.js```

Finally:

```./start.sh``` (and later, ```./stop.sh```)
