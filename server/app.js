// Made by Cena Abachi Known as Devlogerio, find me on Youtube, Instagram, and Github: Devlogeiro LinkedIn: Cena Abachi, devloger.io@gmail.com
// ********************* Const var *********************
var path = require('path');
var http = require('http');
var express = require('express');
var socketIO = require('socket.io');
const Victor = require('victor');

var publicPath = path.join(__dirname, '../client');
var port = process.env.PORT || 2000;
var app = express();
var server = http.createServer(app);
var io = socketIO(server);
app.use(express.static(publicPath));
server.listen(port, function() {
    console.log(`Server is up on port ${port}`);
});

// ********************* Global vars *********************
const map = {minX: -800, maxX: 800, minY: -800, maxY: 800, width: 1600, height: 1600};
middleLocation = new Victor(0, 0);
var players = [];
var jammers = [];
var jammerNumbers = 50;
var antNumbers = 150;
var SOCKET_LIST = {};
var howManyAntsToWin = 35;

io.on('connection', (socket) => {
    var player;
    SOCKET_LIST[socket.id] = socket;

    socket.on('play', (data) => {
        player = new Player(socket.id, data.name, data.color, false, false);
        players.push(player);
        x = 250;
        socket.emit('okPlay', {id: socket.id});
        socket.emit('initPack', {initPack: getHoleInitPack(), jammersInitPack: jammers});
        io.emit('newPlayer', {playerInitPack: player.getInitPack()});
    });

    socket.on('keyAction', (data) => {
        if(!player)
            return;
        if (data.state === 'pressed') {
            if (data.key === 'w') {
                player.movement.up = true;
            } else if (data.key === 's') {
                player.movement.down = true;
            } else if (data.key === 'a') {
                player.movement.left = true;
            } else if (data.key === 'd') {
                player.movement.right = true;
            }
            player.isMoving = true;
        } else if (data.state === 'released') {
            if (data.key === 'w') {
                player.movement.up = false;
            } else if (data.key === 's') {
                player.movement.down = false;
            } else if (data.key === 'a') {
                player.movement.left = false;
            } else if (data.key === 'd') {
                player.movement.right = false;
            }

            if(player.movement.left === false && player.movement.right === false && player.movement.up === false && player.movement.down === false) {
                player.isMoving = false;
            } 
        }
    });

    socket.on('imOut', (data) => {
        if(!player)
            return;
        io.emit('remove', {id: data.id});
        for(var i in players) {
            if(players[i].id === data.id) {
                players.splice(i, 1);
            }
        }
    })

    socket.on('disconnect', () => {
        if(!player)
            return;
        io.emit('remove', {id: player.id});
        for(var i in players) {
            if(players[i].id === player.id) {
                players.splice(i, 1);
                delete SOCKET_LIST[socket.id];
            }
        }
    });

});


// ********************* Classes *********************

class Entity {
    constructor () {
        this.id = '';
        this.room = '';
        this.isMoving = false;
        this.mass = new Victor(1,1);
        this.location = new Victor(0,0);
        this.velocity = new Victor(0,0);
        this.acceleration = new Victor(0,0);
        this.deAcceleration = new Victor(0.8,0.8);
        this.velocityMinLimit = 0.2;
        this.velocityMaxLimit = 2.5;
        this.forceLimit = 0.5;
        this.angle = 0;
    }
    update() {
        if (this.isMoving === false){
            this.velocity.multiply(this.deAcceleration);
            if(this.velocity.length < this.velocityMinLimit) {
                this.velocity = multiply(new Victor(0,0));
            }
        }
        this.velocity.add(this.acceleration);
        this.velocity = limitVector(this.velocity, this.velocityMaxLimit);
        this.angle = this.velocity.angle();
        
        this.location.add(this.velocity);
        this.acceleration = new Victor(0,0);
    }
    applyForce (force){
        force.divide(this.mass);
        this.acceleration.add(force);
    }
}

class Jammer {
    constructor () {
        this.id = Math.random();
        this.location = new Victor(randomNumberBetweenTwoNumbers(map.minX, map.maxX), randomNumberBetweenTwoNumbers(map.minY, map.maxY));
        this.r = randomNumberBetweenTwoNumbers(15, 25);
    }
}

class Player extends Entity {
    constructor (id, name, choosenColor, worker, ai) {
        super();
        this.id = id;
        this.name = name;
        this.color = choosenColor;
        this.isWorker = worker;
        this.isAi = ai;
        this.movement = {left: false, right: false, up: false, down: false};
        this.location = new Victor(randomNumberBetweenTwoNumbers(map.minX, map.maxX), randomNumberBetweenTwoNumbers(map.minY, map.maxY));
        this.savedLocation = this.location.clone();
        // this.location = new Victor(x, 0);
        this.r = 5;
        this.attachedId = '';
        // this.isColliding = false;
        this.stopMove = false;
        this.antNumber = 0;
    }
    update() {
        super.update();
        this.move();
        this.workerMove();
        this.checkCollision();
        this.calculateAntNumbers();
    }
    move () {
        if(this.isWorker === true || this.isAi === true) {
            return;
        }
        var force = new Victor(0, 0);
        if(this.movement.left == true) {
            force = new Victor(-this.forceLimit, 0);
            this.applyForce(force);
        }
        if(this.movement.right == true) {
            force = new Victor(this.forceLimit, 0);
            this.applyForce(force);
        }
        if(this.movement.up == true) {
            force = new Victor(0, -this.forceLimit);
            this.applyForce(force);
        }
        if(this.movement.down == true) {
            force = new Victor(0, this.forceLimit);
            this.applyForce(force);
        }
    }
    workerMove () {
        if(this.isWorker === false) {
            return;
        }

        // if(this.attachedId === '') {
        //     for(var i in players) {
        //         if(players[i].id !== this.id && players[i].isWorker === false) {
        //             var otherPlayer = players[i];
        //             var d = this.location.distance(otherPlayer.location);
        //             if(d < 200) {
        //                 this.attachedId = otherPlayer.id;
        //             }
        //         }
        //     }
        // }

        if(this.attachedId !== '') {
            var found = false;
            for(var i in players) {
                if(players[i].id === this.attachedId) {
                    var otherPlayer = players[i];
                    var d = this.location.distance(otherPlayer.location);
                    if(d > this.r + otherPlayer.r + 10) { // this.isColliding === false && 
                        if(this.stopMove === false) {
                            var force = this.location.clone();
                            force.subtract(players[i].location);
                            this.applyForce(force.rotate(Math.PI));
                        } else {
                            if(otherPlayer.isMoving === true) {
                                this.stopMove = false;
                            }
                        }
                    }
                    found = true;
                }
            }
            if(found === false) {
                var d = this.location.distance(this.savedLocation);
                if(d > this.r * 2) { // this.isColliding === false && 
                    var force = this.location.clone();
                    force.subtract(this.savedLocation);
                    this.applyForce(force.rotate(Math.PI));
                    this.color = '#000000';
                }
            }
        } else {
            var d = this.location.distance(this.savedLocation);
            if(d > this.r * 2) { // this.isColliding === false && 
                var force = this.location.clone();
                force.subtract(this.savedLocation);
                this.applyForce(force.rotate(Math.PI));
            }
        }
    }
    checkCollision() {
        // var collisionFound = false;
        for(var i in players) {
            if(players[i].id !== this.id) {
                var otherPlayer = players[i];
                if(this.location.distance(otherPlayer.location) < this.r + otherPlayer.r && otherPlayer.attachedId !== this.id) {
                    var force = this.location.clone();
                    force.subtract(otherPlayer.location);
                    this.applyForce(force);
                    this.stopMove = true;
                    if(otherPlayer.isWorker === true && this.isWorker === false) {
                        otherPlayer.attachedId = this.id;
                        otherPlayer.color = this.color;
                    }
                    // this.isColliding = true;
                    // collisionFound = true;
                }
            }
        }

        for(var i in jammers) {
            var j = jammers[i];
            var d = this.location.distance(j.location);
            if(d < this.r + j.r) {
                if(this.isWorker === true) {
                    this.attachedId = '';
                    this.color = '#000000';
                    var force = this.location.clone();
                    force.subtract(j.location);
                    this.applyForce(force);
                } else {
                    var force = this.location.clone();
                    force.subtract(j.location);
                    this.applyForce(force);
                }
            }
        }

        // var distanceFromMiddle = this.location.distance(middleLocation);
        // if(distanceFromMiddle > map.maxX + 60) {
        //     var force = middleLocation.clone();
        //     force.subtract(this.location);
        //     this.applyForce(force);
        // }
        if(this.location.x > map.maxX) {
            var force = new Victor(-50, 0);
            this.applyForce(force);
        }
        if(this.location.x < map.minX) {
            var force = new Victor(50, 0);
            this.applyForce(force);
        }
        if(this.location.y > map.maxY) {
            var force = new Victor(0, -50);
            this.applyForce(force);
        }
        if(this.location.y < map.minY) {
            var force = new Victor(0, 50);
            this.applyForce(force);
        }
    }
    calculateAntNumbers() {
        var number = 0;
        for(var i in players) {
            if(players[i].attachedId === this.id) {
                number++;
            }
        }
        this.antNumber = number;
        if(this.antNumber >= howManyAntsToWin) {
            endAction(this.id, this.name, this.color);
        }
    }
    getInitPack() {
        var pack = {
            id: this.id,
            name: this.name,
            color: this.color,
            location: this.location,
            isWorker: this.isWorker,
            isAi: this.isAi
        };
        return pack;
    }
    getUpdatePack() {
        var pack = {
            id: this.id,
            location: this.location,
            angle: this.angle,
            color: this.color,
            antNumber: this.antNumber
        };
        return pack;
    }
}


// ********************* Functions *********************

function randomNumberBetweenTwoNumbers(min, max) {
    return Math.floor(Math.random() * (max - (min - 1)) + (min - 1) + 1); // +1 important
}

getHoleInitPack = () => {
    var pack = [];
    for(var i in players) {
        pack.push(players[i].getInitPack());
    }
    return pack;
}

getHoleUpdatePack = () => {
    var pack = [];
    for(var i in players) {
        pack.push(players[i].getUpdatePack());
    }
    return pack;
}

var limitVector = (givenVector, limit) => {
    var vector = givenVector;
    var mag = vector.magnitude();
    if(mag > limit){
        vector.x = vector.x * limit / mag;
        vector.y = vector.y * limit / mag;
        return vector;
    }
    return vector;
}

var endAction = (id, name, color) => {
    io.emit('endGame', {id, name, color});
    for(var i in players) {
        players[i].attachedId = '';
        players[i].color = '#000000';
    }
    for(var i in SOCKET_LIST) {
        SOCKET_LIST[i].disconnect();
    }
}

// ********************* Main loop *********************

setInterval(function() {
    for(var i in players) {
        var p = players[i];
        p.update();
    }
    io.emit('updatePack', {updatePack: getHoleUpdatePack()});
}, 1000/25);


setInterval(function() {
    for(var i in players) {
        var p = players[i];
        p.update();
    }
    io.emit('updatePack', {updatePack: getHoleUpdatePack()});
}, 1000/30);

generateAnts = () => {
    for(var i = 0; i <= antNumbers ; i++) {
        var p = new Player(Math.random(), 'ant', '#000000', true, false);
        players.push(p);
    }
}
generateAnts();

generateJammers = () => {
    for(var i = 0; i <= jammerNumbers ; i++) {
        var j = new Jammer;
        jammers.push(j);
    }
}
generateJammers();
