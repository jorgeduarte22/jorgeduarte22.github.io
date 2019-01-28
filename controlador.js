var init = function(username) {
	var board;
	mensaje = $('#mensaje')
	socketStatus = $('#socketStatus')
	opponentStatus = $('#opponentStatus')

	window.WebSocket = window.WebSocket || window.MozWebSocket;
	if(!window.WebSocket) {
		mensaje.html($('<p>',
			{text:'El navegador no soporta WebSocket.'}
		));
		return;
	}

	const server_url = "wss:chess.cloudno.de";
	//const server_url = "ws:192.168.1.100:3000";//"wss:chess.cloudno.de";
	var webSocket;

	establishConnection();

	function establishConnection() {
		webSocket = new WebSocket(server_url);

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
			socketStatus.html($('<p>',
				{text:'Estado de la conexion: Online'}
			));
			webSocket.send(JSON.stringify({
				request:"register",
				id:username
			}));

			keepAlive();
		};

		webSocket.onclose = function() {
			console.log('Desconectado');
			socketStatus.html($('<p>',
				{text:'Estado de la conexion: Offline'}
			));
			establishConnection();
		}
	}

	var lastPosition;

	webSocket.onmessage = function(message) {
		var m = JSON.parse(message.data);
		console.log("Mensaje ", m);
		if(m.request === "register") {
			if(m.response === "ok") {
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
				game();
			} else {
				mensaje.html($('<p>',
					{text:'Error al contactar con el servidor. Intenta de nuevo mas tarde.'}
				));
			}
		} else if(m.request === "update") {
			lastPosition = m.position;
			console.log("POS ", lastPosition);
			board.position(lastPosition, true);
		} else if(m.request === "opponent") {
			console.log("Opponent");
			if(m.status === "online") {
				opponentStatus.html($('<p>',
					{text:'Opponent status: Online'}
				));
			} else if(m.status === "offline") {
				opponentStatus.html($('<p>',
					{text:'Opponent status: Offline'}
				));
			}
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
			if(webSocket.readyState ==WebSocket.OPEN) {
				webSocket.send(JSON.stringify({
				  	request: "move",
				  	id:username,
				    source: source,
				    target: target,
				    promotion: 'q' // NOTE: always promote to a queen for example simplicity
				}));
			} else {
				board.position(lastPosition, true);
			}
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

function deleteElements() {
    var elem = document.getElementById("username");
    elem.parentNode.removeChild(elem);
    elem = document.getElementById("sendUser");
    elem.parentNode.removeChild(elem);
}

function readUsername() {
	$(document).ready(function() {
		var username = document.getElementById("username").value;
		if(username.length == 0)
			return;
		console.log('Usuario ', username);
		deleteElements();
		init(username);
	});
}

if (typeof exports !== 'undefined') exports.Chess = Chess;
