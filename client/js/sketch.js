
// ********************* Global vars *********************
var socket;
var menuDiv;
var nameInput;
var playButton;
var players;
var myId;
var gameMap;
var gridWidth;
var pg;
var colorPicker;
var statusDiv;
var jammers;
var jammerModel;
var endGameDiv;
var resetButton;
var music;
var winAntNumber;
var gameIsEnd;
var loadingDiv;

// ********************* Default functions *********************
function preload() {
    jammerModel = loadModel('assets/jammer.obj');
    music = loadSound('assets/music.mp3');
}

function setup() {
    socket = io();
    createCanvas(windowWidth, windowHeight, WEBGL);
    gameMap = {minX: -800, maxX: 800, minY: -800, maxY: 800, width: 1600, height: 1600};
    gridWidth = 50;
    pg = createGraphics(gameMap.width, gameMap.height);
    winAntNumber = 35;
    gameIsEnd = false;

    nameInput = document.getElementById('nameInput');
    playButton = document.getElementById('playButton');
    menuDiv = document.getElementById('menuDiv');
    colorPicker = document.getElementById('colorPicker');
    statusDiv = document.getElementById('statusDiv');
    endGameDiv = document.getElementById('endGameDiv');
    resetButton = document.getElementById('resetButton');
    loadingDiv = document.getElementById('loadingDiv');
    players = [];
    jammers = [];
    myId = '';

    colorPicker.value = '#'+(Math.random()*0xFFFFFF<<0).toString(16);
    nameInput.value = 'noob' + round(Math.random() * 100);

    playButton.onclick = () => {
        socket.emit('play', {name: nameInput.value, color: colorPicker.value})
    };
    socket.on('okPlay', (data) => {
        myId = data.id;
        menuDiv.style.display = 'none';
    });
    socket.on('endGame', (data) => {
        gameIsEnd = true;
        if(data.id === myId) {
            statusDiv.innerHTML = 'Collect ' + winAntNumber + ' ants to win! </br>' + winAntNumber + '/' + winAntNumber;
        }
        resetButton.style.backgroundColor = data.color;
        resetButton.style.fontSize = '4vh';
        resetButton.innerHTML = "The winner is: " + data.name + "</br>Click to play again!";
        resetButton.style.fontSize = '6vh';
        resetButton.style.display = 'block';
    });
    socket.on('initPack', (data) => {
        for(var i in data.initPack) {
            var p = data.initPack[i];
            if(p.id !== myId) {
                new Player(p.id, p.name, p.color, p.location, p.isWorker, p.isAi);
            }
        }
        for(var i in data.jammersInitPack) {
            var j = data.jammersInitPack[i];
            new Jammer(j.id, j.location, j.r);
        }
        statusDiv.style.display = 'block';
        music.loop();
    });
    socket.on('newPlayer', (data) => {
        new Player(data.playerInitPack.id, data.playerInitPack.name, data.playerInitPack.color, data.playerInitPack.location);
    });
    socket.on('updatePack', (data) => {
        for(var i in data.updatePack) {
            var p = data.updatePack[i];
            for(var j in players) {
                var localPlayer = players[j];
                if(p.id === localPlayer.id) {
                    localPlayer.location.x = p.location.x;
                    localPlayer.location.y = p.location.y;
                    localPlayer.angle = p.angle;
                    localPlayer.color = p.color;
                    localPlayer.antNumber = p.antNumber;
                }
            }
        }
    });
    socket.on('remove', (data) => {
        for(var i in players) {
            if(players[i].id === data.id) {
                players.splice(i, 1);
            }
        }
    });

    drawGrid();
    loadingDiv.style.display = 'none';
    console.log('Music credit: https://freesound.org/people/dAmbient/');
}

function drawGrid() {
	pg.stroke('#A83E5E');
	pg.strokeWeight(1);
    pg.fill('#432D61')
    pg.rect(0, 0, gameMap.width, gameMap.height);
	for (var x = 0; x < gameMap.width; x += gridWidth) {
		for (var y = 0; y < gameMap.height; y += gridWidth) {
			pg.line(x, 0, x, gameMap.width);
			pg.line(0, y, gameMap.height, y);
		}
    }
}

function draw() {
    background('#432D61');

    push();
    translate(0, 0, 0);
    imageMode(CENTER);
    image(pg, 0, 0);
    pop();
    stroke(0);

    var me;
    for(var i in players) {
        if(players[i].id === myId) {
            me = players[i];
        }
    }

    if(!me) {
        return;
    }

    for(var i in players) {
        var p = players[i];
        var d = dist(me.location.x, me.location.y, p.location.x, p.location.y);
        if(d < 500) {
            p.draw();
        }
    }

    push();
    fill('#E95648');
    stroke('#DAA26E');
    for(var i in jammers) {
        var j = jammers[i];
        var d = dist(me.location.x, me.location.y, j.location.x, j.location.y);
        if(d < 500) {
            p.draw();
        }
        j.draw();
    }
    pop();
}

// ********************* Objects *********************
var Player = function(id, name, choosenColor, location, worker, ai) {
    this.id = id;
    this.name = name;
    this.color = choosenColor;
    this.location = createVector(location.x, location.y, 0);
    this.angle = 0;
    this.isWorker = worker;
    this.isAi = ai;
    this.antNumber = 0;
    this.draw = function() {
        if(this.id === myId && gameIsEnd === false) {
            mouseLocation = createVector((mouseX - width / 2), (mouseY - height / 2), 0); // gets the location of the mouse according to the middle of the screen
            var loc = createVector(this.location.x, this.location.y).sub(mouseLocation.limit(100)); // getts the vector between the players sperm and mouse and limits its length (magnitude) by 100
            camera(loc.x, loc.y, 200, this.location.x, this.location.y, 0, 0, 1, 0);
            statusDiv.innerHTML = 'Collect ' + winAntNumber + ' ants to win! </br>' + this.antNumber + '/' + winAntNumber;
        }
        push();
        translate(this.location.x, this.location.y, this.location.z);
        rotate(this.angle);
        strokeWeight(0.2);
        stroke(0);
        fill(this.color);
        if(this.isWorker) {
            ellipsoid(5, 3, 3, 5, 5);
            translate(2, 0, 0)
            box(1, 10, 1)
            translate(-4, 0, 0)
            box(1, 10, 1)
        } else if(this.isAi) {

        } else {
            ellipsoid(8, 4, 4, 5, 5);
            translate(3, 0, 0)
            box(1, 12, 1)
            translate(-6, 0, 0)
            box(1, 12, 1)
            // sphere(10, 10, 3);
        }
        pop();
    } ;

    players.push(this);
    return this;
}

var Jammer = function(id, location, r) {
    this.id = id;
    this.location = createVector(location.x, location.y, 0);
    this.r = r;
    this.angle = Math.random() * 3.14 + 0.1;
    this.draw = function() {
        push();
        translate(this.location.x, this.location.y, this.location.z);
        rotate(this.angle);
        // strokeWeight(1);
        scale(this.r)
        model(jammerModel);
        // sphere(this.r, this.r, 6);
        pop();
    } ;

    jammers.push(this);
    return this;
}

// ********************* Functions *********************

// ********************* Events *********************
function keyPressed() {
    if (!socket) {
        return;
    }
    socket.emit('keyAction', {
        state: 'pressed',
        key: key
    });
}

function keyReleased() {
    if (!socket) {
        return;
    }
    socket.emit('keyAction', {
        state: 'released',
        key: key
    });
}

window.onbeforeunload = function() {
    if(myId !== '')
        this.socket.emit('imOut', {id: myId});
}

function windowResized() {
  resizeCanvas(windowWidth, windowHeight);
}