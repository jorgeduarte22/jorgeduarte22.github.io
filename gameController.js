class Game {
	constructor(numPlayers) {
		this._numPlayers = numPlayers;
		this._board = new Board(document.getElementById('game'), this._numPlayers);
	}

	start() {
		this._setEventListeners();
		this._prepareTurn();
	}

	_setEventListeners() {
		let self = this;
		document.addEventListener('gameClick', function handleClickEvent(gameEvent) {
			console.log(gameEvent);
			if(gameEvent.gameTarget instanceof Line)
				self._board.clickLine(gameEvent.gameTarget);

			let event = document.createEvent("HTMLEvents");
			event.initEvent("gameDeselect", true, false);
			event.gameTarget = self;
			document.dispatchEvent(event);

			if(gameEvent.gameTarget instanceof Tile)
				self._board.clickTile(gameEvent.gameTarget);

			if(self._board.isTurnOver()) {
				self._board.finishTurn();
				if(!self._board.isGameOver())
					self._board.nextTurn();
			}
		});
	}

	_prepareTurn() {
		this._board.nextTurn();
	}
}

var STARTING_TILE_TYPE = 5;

class Board {
	constructor(parentElement, numPlayers) {
		this._numPlayers = numPlayers;
		this._parentElement = parentElement;
		this._element = this._createElement();
		this._startingTile = new Tile(document.getElementById('hiddenElement'), STARTING_TILE_TYPE);
		this._lidTiles = this._createTiles();
		this._center = new Center(this._element, numPlayers*2+1);
		this._players = this._createPlayers(numPlayers);
		this._currentPlayer = 0;
		this._turn = 0;
		this._nextTurnPlayer = 0;
	}

	_createElement() {
		let e = document.createElement('div');
		e.setAttribute('class', 'board');
		this._parentElement.appendChild(e);
		return e;
	}

	_createTiles() {
		let tiles = [];
		for(let i = 0; i < 5; i++)
			for(let j = 0; j < 20; j++)
				tiles.push(new Tile(document.getElementById('hiddenElement'), i));
		return tiles;
	}

	_createPlayers(numPlayers) {
		let players = [];
		for(let i = 0; i < numPlayers; i++)
			players.push(new Player(this._element, i));
		return players;
	}

	finishTurn() {
		if(this._turn > 0) {
			this._players.forEach(p => p.promoteTiles());
			this._players.forEach(p => p.updateScore());
			let tiles = this._collectTiles();
			this._lidTiles.push(...tiles);
			tiles.forEach(t => t.moveTo(document.getElementById('hiddenElement')));
		}
	}

	nextTurn() {
		this._dealTiles();
		this._turn += 1;
		this._currentPlayer = this._nextTurnPlayer;
	}

	_collectTiles() {
		let tiles = [];
		for(let p of this._players)
			tiles.push(...p.collectTiles());
		return tiles;
	}

	_dealTiles() {
		this._shuffleLidTiles();
		let self = this;
		this._center.dealTiles(function() {
			return self._lidTiles.pop();
		});
		this._center.placeTile(this._startingTile);
	}

	isTurnOver() {
		return !this._center.areTilesLeft();
	}

	clickTile(tile) {
		this._center.selectTile(tile);
	}

	_shuffleLidTiles() {
		for(let i = this._lidTiles.length-1; i > 0; i--) {
			const j = Math.floor(Math.random() * (i + 1));
			[this._lidTiles[i], this._lidTiles[j]]= [this._lidTiles[j], this._lidTiles[i]];
		}
	}

	clickLine(line) {
		if(!this._players[this._currentPlayer].isPlaceable(this._center.getSelectedTilesType(), line))
			return;

		let tiles = this._center.getSelectedTiles();
		if(tiles.find(t => t.isStartingTile()))
			this._nextTurnPlayer = this._currentPlayer;

		this._players[this._currentPlayer].placeTiles(tiles, line);
		this._nextPlayer();
	}

	_nextPlayer() {
		this._currentPlayer += 1;
		this._currentPlayer %= this._numPlayers;
	}

	isGameOver() {
		return this._players.find(p => p.isRowCompleted());
	}
}

class Player {
	constructor(parentElement, id) {
		this._id = id;
		this._score = 0;
		this._parentElement = parentElement;
		this._element = this._createElement();
		this._linesElement = this._createLinesElement();
		this._lines = this._createLines();
		this._floorElement = this._createFloorElement();
		this._floorLine = new FloorLine(this._floorElement);
		this._wall = new Wall(this._element);
		this._scoreElement = this._createScoreElement();
	}

	_createFloorElement() {
		let e = document.createElement('div');
		e.setAttribute('class', 'floor');
		this._element.appendChild(e);
		return e;
	}

	_createLinesElement() {
		let e = document.createElement('div');
		e.setAttribute('class', 'lines');
		this._element.appendChild(e);
		return e;
	}

	_createElement() {
		let e = document.createElement('div');
		e.setAttribute('class', 'player player'+this._id);
		this._parentElement.appendChild(e);
		return e;
	}

	_createLines() {
		let lines = [];
		for(let i = 1; i <= 5; i++)
			lines.push(new Line(this._linesElement, i));
		return lines;
	}

	_createScoreElement() {
		let e = document.createElement('div');
		e.setAttribute('class', 'score');
		e.innerText = this._score;
		this._element.appendChild(e);
		return e;
	}

	isPlaceable(tileType, line) {
		if(line == this._floorLine)
			return true;
		if(!this._lines.includes(line))
			return false;
		if(!line.isPlaceable(tileType))
			return false;
		if(!this._wall.isPlaceable(tileType, line.getRowNumber()))
			return false;

		let placingLine = this._lines.find(l => l.getTilesType() == tileType);
		return !placingLine || placingLine == line;
	}

	placeTiles(tiles, line) {
		let extraTiles = line.addTiles(this._handlePlacingStartingTile(tiles));
		this._floorLine.addTiles(extraTiles);
	}

	_handlePlacingStartingTile(tiles) {
		let startingTile = tiles.find(t => t.isStartingTile());
		if(startingTile) {
			this._floorLine.addTiles([startingTile]);
			return tiles.filter(t => !t.isStartingTile());
		}
		return tiles;
	}

	promoteTiles() {
		for(let l of this._lines) {
			let promotedTile = l.getPromotedTile();
			if(promotedTile) {
				this._wall.placeTile(promotedTile, l.getRowNumber());
			}
		}
	}

	collectTiles() {
		let tiles = this._floorLine.collectTiles();
		for(let l of this._lines)
			tiles.push(...l.collectTiles());
		return tiles;
	}

	updateScore() {
		let score = this._wall.calculateScore();
		this._score += score;
		score = this._floorLine.calculateScore();
		this._score -= score;
		this._score = Math.max(this._score, 0);
		this._scoreElement.innerText = this._score;
	}

	isRowCompleted() {
		return this._wall.isRowCompleted();
	}
}

class Line {
	constructor(parentElement, numberOfTiles) {
		this._parentElement = parentElement;
		this._element = this._createElement();
		this._tiles = [];
		this._numberOfTiles = numberOfTiles;
	}

	_createElement() {
		let e = document.createElement('div');
		e.setAttribute('class', 'line');
		let self = this;
		e.addEventListener('click', function() {
			let event = document.createEvent("HTMLEvents");
			event.initEvent("gameClick", true, false);
			event.gameTarget = self;
			e.dispatchEvent(event);
		});
		this._parentElement.appendChild(e);
		return e;
	}

	addTiles(tiles) {
		while(tiles.length > 0 && this._tiles.length < this._numberOfTiles) {
			let t = tiles.pop();
			this._tiles.push(t);
			t.moveTo(this._element);
		}
		return tiles;
	}

	isPlaceable(tileType) {
		return this._tiles.length == 0 || this._tiles[0].getType() == tileType;
	}

	getTilesType() {
		if(this._tiles.length == 0)
			return null;
		return this._tiles[0].getType();
	}

	getPromotedTile() {
		if(this._tiles.length == this._numberOfTiles)
			return this._tiles.pop();
		return undefined;
	}

	collectTiles() {
		let tiles = this._tiles;
		this._tiles = [];
		return tiles.filter(t => !t.isStartingTile());
	}

	isCompleted() {
		return this._tiles.length == this._numberOfTiles;
	}

	getRowNumber() {
		return this._numberOfTiles-1;
	}
}

class FloorLine extends Line {
	constructor(parentElement) {
		super(parentElement, 100);
		this._values = [0, 1, 2, 4, 6, 8, 11, 14];
	}

	calculateScore() {
		let numTiles = Math.min(this._tiles.length, this._values.length-1);
		return this._values[numTiles];
	}
}

class Center {
	constructor(parentElement, numFactories) {
		this._parentElement = parentElement;
		this._element = this._createElement();
		this._factoriesElement = this._createFactoriesElement();
		this._centerElement = this._createCenterElement();
		this._factories = this._createFactories(numFactories);
		this._centerTiles = [];
	}

	_createElement() {
		let e = document.createElement('div');
		e.setAttribute('class', 'center');
		this._parentElement.appendChild(e);
		return e;
	}

	dealTiles(randomTile) {
		for(let i = 0; i < 4; i++)
			this._factories.forEach(f => f.placeTile(randomTile()));
	}

	areTilesLeft() {
		for(let f of this._factories)
			if(!f.isEmpty())
				return true;

		//Rare case, but could happen
		if(this._centerTiles.length == 1 && this._centerTiles[0].isStartingTile())
			return false;
		
		return this._centerTiles.length > 0;
	}

	selectTile(tile) {
		if(this._centerTiles.includes(tile))
			this._centerTiles
				.filter(t => t.getType() == 5 || t.getType() == tile.getType())
				.forEach(t => t.select());
		else
			this._factories.forEach(f => f.selectTile(tile));
	}

	placeTile(tile) {
		this.placeTiles([tile]);
	}

	placeTiles(tiles) {
		this._centerTiles.push(...tiles);
		tiles.forEach(f => f.moveTo(this._centerElement));
	}

	getSelectedTiles() {
		for(let f of this._factories) {
			let tiles = f.getSelectedTiles();
			if(tiles.length != 0) {
				this.placeTiles(f.getUnselectedTiles());
				f.emptyTiles();
				return tiles;
			}
		}
		let tiles = this._centerTiles.filter(t => t.isSelected());
		this._centerTiles = this._centerTiles.filter(t => !t.isSelected());
		return tiles;
	}

	getSelectedTilesType() {
		for(let f of this._factories) {
			let type = f.getSelectedTilesType();
			if(type != null)
				return type;
		}
		return this._getSelectedTilesType();
	}

	_getSelectedTilesType() {
		let t = this._centerTiles.find(t => t.isSelected() && !t.isStartingTile());
		if(t)
			return t.getType();
		return t;
	}

	_createFactoriesElement() {
		let e = document.createElement('div');
		e.setAttribute('class', 'factories');
		this._element.appendChild(e);
		return e;
	}

	_createCenterElement() {
		let e = document.createElement('div');
		e.setAttribute('class', 'centerTiles');
		this._element.appendChild(e);
		return e;
	}

	_createFactories(numFactories) {
		let factories = [];
		for(let i = 0; i < numFactories; i++)
			factories.push(new Factory(this._factoriesElement))
		return factories;
	}
}

class Factory {
	constructor(parentElement) {
		this._parentElement = parentElement;
		this._element = this._createElement();
		this._tiles = [undefined, undefined, undefined, undefined];
	}

	_createElement() {
		let e = document.createElement('div');
		e.setAttribute('class', 'factory');
		this._parentElement.appendChild(e);
		return e;
	}

	placeTile(tile) {
		let availabeSlot = 0;
		while(this._tiles[availabeSlot] != undefined)
			availabeSlot += 1;

		if(availabeSlot >= 4)
			return;

		this._tiles[availabeSlot] = tile;
		tile.moveTo(this._element);
	}

	isEmpty() {
		for(let t of this._tiles)
			if(t != undefined)
				return false;
		return true;
	}

	selectTile(tile) {
		if(this._tiles.includes(tile))
			this._tiles.filter(t => t.getType() === tile.getType())
				.forEach(t => t.select());
	}

	getSelectedTiles() {
		return this._tiles.filter(t => t.isSelected());
	}


	getUnselectedTiles() {
		return this._tiles.filter(t => !t.isSelected());
	}

	emptyTiles() {
		this._tiles = [];
	}

	getSelectedTilesType() {
		let tile = this._tiles.find(t => t.isSelected());
		if(tile)
			return tile.getType();
		return null;
	}
}

class Wall {
	constructor(parentElement) {
		this._parentElement = parentElement;
		this._element = this._createElement();
		this._cellsElements = this._createCellsElements();
		this._cells = this._createCells();
		this._cellsTurns = this._createCellsTurns();
	}

	_createElement() {
		let e = document.createElement('div');
		e.setAttribute('class', 'wall');
		this._parentElement.appendChild(e);
		return e;
	}

	_createCellsElements() {
		let cells = [];
		for(let i = 0; i < 5; i++) {
			let row = [];
			let row_element = document.createElement('div');
			row_element.setAttribute('class', 'row');
			this._element.appendChild(row_element);

			for(let j = 0; j < 5; j++) {
				let type = this._calculateType(i, j);
				let e = document.createElement('div');
				e.setAttribute('class', 'cell cell'+type);
				row_element.appendChild(e);
				row.push(e);
			}
			cells.push(row);
		}
		return cells;
	}

	_createCells() {
		let cellTurn = [];
		for(let i = 0; i < 5; i++)
			cellTurn.push([null, null, null, null, null]);
		return cellTurn;
	}

	_calculateType(row, column) {
		return (row*6+column)%5;
	}

	_createCellsTurns() {
		let cellsTurns = [];
		for(let i = 0; i < 5; i++)
			cellsTurns.push([0, 0, 0, 0, 0]);
		return cellsTurns;
	}

	_calculateColumn(rowNumber, cellType) {
		return (cellType-rowNumber+5)%5;
	}

	isPlaceable(tileType, rowNumber) {
		return !this._cells[rowNumber][this._calculateColumn(rowNumber, tileType)];
	}

	placeTile(tile, rowNumber) {
		let column = this._calculateColumn(rowNumber, tile.getType());
		this._cells[rowNumber][column] = tile;
		this._cellsTurns[rowNumber][column] = 1;
		tile.moveTo(this._cellsElements[rowNumber][column]);
	}

	_calculateScore(i, j) {
		let i_aux = i;
		let verticalScore = 0;
		
		while(i_aux > 0 && this._cells[i_aux-1][j]) {
			i_aux -= 1;
		}

		while(i_aux < 5 && this._cells[i_aux][j]) {
			i_aux += 1;
			verticalScore += 1;
		}

		if(verticalScore <= 1)
			verticalScore = 0;

		let j_aux = j;
		let horizontalScore = 0;

		while(j_aux > 0 && this._cells[i][j_aux-1]) {
			j_aux -= 1;
		}

		while(i_aux < 5 && this._cells[i][j_aux]) {
			j_aux += 1;
			horizontalScore += 1;
		}

		if(horizontalScore <= 1)
			horizontalScore = 0;

		return Math.max(1, verticalScore + horizontalScore);
	}

	calculateScore() {
		let score = 0;
		for(let i = 0; i < 5; i++)
			for(let j = 0; j < 5; j++)
				if(this._cellsTurns[i][j] == 1) {
					score += this._calculateScore(i, j);
				}

		for(let i = 0; i < 5; i++)
			for(let j = 0; j < 5; j++)
				this._cellsTurns[i][j] = 0;

		return score;
	}

	_isRowCompleted(rowNumber) {
		console.log("ISCOMPLETED ", this._cells[rowNumber], this._cells[rowNumber].filter(c => c));
		return this._cells[rowNumber].filter(c => c).length == 5;
	}

	isRowCompleted() {
		for(let i = 0; i < 5; i++)
			if(this._isRowCompleted(i))
				return true;
		return false;
	}
}

class Tile {
	constructor(parentElement, type) {
		this._parentElement = parentElement;
		this._makeSelectable();
		this._element = this._createElement(type);
		this._type = type;
		this._selected = false;
	}

	_createElement(type) {
		let e = document.createElement('div');
		e.setAttribute('class', 'tile type' + type);
		let self = this;
		e.addEventListener('click', function() {
			if(!self.isStartingTile()) {
				let event = document.createEvent("HTMLEvents");
				event.initEvent("gameClick", true, false);
				event.gameTarget = self;
				e.dispatchEvent(event);
			}
		});
		this._parentElement.appendChild(e);
		return e;
	}

	_makeSelectable() {
		let self = this;
		document.addEventListener('gameDeselect', function(event) {
			self.deselect();
		});
	}

	moveTo(newParent) {
		this._parentElement = newParent;
		this._parentElement.appendChild(this._element);
	}

	getType() {
		return this._type;
	}

	isSelected() {
		return this._selected;
	}

	select() {
		this._selected = true;
		this._element.classList.add("selected");
	}

	deselect() {
		this._selected = false;
		this._element.classList.remove("selected");
	}

	isStartingTile() {
		return this._type == STARTING_TILE_TYPE;
	}
}

function newGame() {
	var game = new Game(2);
	game.start();
}