var init = function() {
	var board;
	mensaje = $('#mensaje')

	window.WebSocket = window.WebSocket || window.MozWebSocket;
	if(!window.WebSocket) {
		mensaje.html($('<p>',
			{text:'El navegador no soporta WebSocket.'}
		));
		return;
	}

	var webSocket = new WebSocket("ws:chess.cloudno.de");

	var timerId = 0; 
	function keepAlive() { 
	    var timeout = 20000;  
	    if (webSocket.readyState == webSocket.OPEN) {  
	        webSocket.send(JSON.stringify({
	        	request: "alive"
	        }));  
	    }  
	    timerId = setTimeout(keepAlive, timeout);  
	}

	function cancelKeepAlive() {  
	    if (timerId) {  
	        clearTimeout(timerId);  
	    }
	}

	webSocket.onopen = function() {
		webSocket.send(JSON.stringify({
			request: "getid"
		}));

		keepAlive();
	};

	webSocket.onclose = function() {
		cancelKeepAlive();
	}

	var playerID;

	webSocket.onmessage = function(message) {
		var m = JSON.parse(message.data);
		console.log("Mensaje ", m);
		if(m.request === "getid") {
			if(m.id === "error") {
				mensaje.html($('<p>',
					{text:'Demasiados jugadores. Intenta de nuevo mas tarde.'}
				));
			} else {
				playerID = m.id;
				game();

				var btn = document.createElement("BUTTON");
				var t = document.createTextNode("Restart");
				btn.addEventListener('click', function() {
					webSocket.send(JSON.stringify({
						request: "restart"
					}));
					console.log('Restarting');
				});
				btn.appendChild(t);
				document.body.appendChild(btn);
			}
		} else if(m.request === "update") {
			var pos = m.position;
			console.log("POS ", pos);
			console.log(typeof pos);
			board.position(pos, true);
		}
	}

	webSocket.onerror = function(error) {
		mensaje.html($('<p>',
			{text:'Problema al conectar con el servidor.'}
		));
		return;
	}

	function game() {
		//var connection = new WebSocket('ws:///C:/Users/Usuario/Documents/Programaci%C3%B3n/Jorge/HTML/controlador.js');
		var game = new Chess(),
		  statusEl = $('#status'),
		  fenEl = $('#fen'),
		  pgnEl = $('#pgn');

		// do not pick up pieces if the game is over
		// only pick up pieces for the side to move
		var onDragStart = function(source, piece, position, orientation) {
		  if (game.game_over() === true) {
		    return false;
		  }
		};

		var onDrop = function(source, target) {
		  // see if the move is legal
		  webSocket.send(JSON.stringify({
		  	request: "move",
		  	id:playerID,
		    source: source,
		    target: target,
		    promotion: 'q' // NOTE: always promote to a queen for example simplicity
		  }));
		};

		var cfg = {
		  draggable: true,
		  position: 'start',
		  onDragStart: onDragStart,
		  onDrop: onDrop
		};

		board = ChessBoard('board', cfg);
	};
}

if (typeof exports !== 'undefined') exports.Chess = Chess;
$(document).ready(init);