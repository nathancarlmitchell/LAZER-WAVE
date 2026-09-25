// Lazer Wave -- the world. The component the player piece and every hazard is made of, and the hit test between
// them; the piece's movement toward its target, in steps that cannot jump a hazard; the hazards themselves, which
// are empty until the waves exist; the refit after a resize; and the random helpers. index.html loads this with a
// plain <script src>, as globals rather than modules, so the game still opens straight off disk.

var PIECE_SIZE = 12; // px: the player's hitbox, the core where the two waves meet (player.js draws it)
var MOVE_STEP = 5; // px: the most the piece moves between hit tests, so a fast mouse can't jump a thin hazard

var hazards = []; // everything in the world: what kills on touch, and laser form's targets and gates, whose hits is
                  // never true. A hazard is a component, or anything with the same x/y/width/height and update(); a
                  // laser that isn't a rectangle can bring its own crashWith test (hits)
function clearObjects() {
    hazards = [];
}

function component(width, height, color, x, y) {
    this.width = width;
    this.height = height;
    this.color = color;
    this.x = x;
    this.y = y;
    this.update = function () {
        ctx.fillStyle = this.color;
        ctx.fillRect(this.x, this.y, this.width, this.height);
    };

    this.crashWith = function (otherobj) {
        if (otherobj.width <= 0 || otherobj.height <= 0) {
            return false; // nothing drawn, so nothing to hit
        }
        return !(this.y + this.height < otherobj.y || this.y > otherobj.y + otherobj.height ||
                 this.x + this.width < otherobj.x || this.x > otherobj.x + otherobj.width); // touching edges count as a hit
    };
}

function hitHazard() { // is gamePiece touching any hazard. A hazard with its own hits(piece) test uses that instead
    for (var i = 0; i < hazards.length; i++) {
        var h = hazards[i];
        if (h.hits ? h.hits(gamePiece) : gamePiece.crashWith(h)) {
            return true;
        }
    }
    return false;
}

function movePiece(targetX, targetY, ghost) { // move gamePiece to its target, returns true on a crash. A ghost
    // (just hit, and flickering) goes straight there, through anything
    if (ghost) {
        gamePiece.x = targetX;
        gamePiece.y = targetY;
        return false;
    }
    // step at most MOVE_STEP px at a time so fast mouse moves (or moving while paused) can't jump over hazards
    var startX = gamePiece.x;
    var startY = gamePiece.y;
    var dx = targetX - startX;
    var dy = targetY - startY;
    var steps = Math.max(1, Math.ceil(Math.max(Math.abs(dx), Math.abs(dy)) / MOVE_STEP));
    for (let s = 1; s <= steps; s += 1) {
        gamePiece.x = startX + dx * s / steps;
        gamePiece.y = startY + dy * s / steps;
        if (hitHazard()) {
            return true;
        }
    }
    return false;
}

function resizeAroundCenter(obj, size) { // make obj a size x size square with the same center
    obj.x -= (size - obj.width) / 2;
    obj.y -= (size - obj.height) / 2;
    obj.width = size;
    obj.height = size;
}

function worldStep() { // each step: move every hazard, and drop the ones that are finished. A hazard's step(), if it
    // has one, moves it and returns false once it is done; the waves will be built out of these
    for (let i = hazards.length - 1; i >= 0; i--) {
        var h = hazards[i];
        if (h.step && h.step() === false) {
            hazards.splice(i, 1);
        }
    }
}

function drawWorld() { // every hazard, as it stands
    for (var i = 0; i < hazards.length; i++) {
        hazards[i].update();
    }
}

function fitWorldToWindow() { // after a resize: a hazard sized to the window can refit itself (fit), and one that
    // would grow onto the piece keeps its old size, since that would be a death nobody could dodge
    hazards.forEach(function (h) {
        if (!h.fit) {
            return;
        }
        var before = { x: h.x, y: h.y, width: h.width, height: h.height };
        h.fit();
        if (gamePiece.crashWith(h) && !gamePiece.crashWith(before)) {
            Object.assign(h, before);
        }
    });
}

function getRandomColor() {  // generate a random color
    var letters = '0123456789ABCDEF';
    var color = '#';
    for (var i = 0; i < 6; i++) {
        color += letters[Math.floor(Math.random() * 16)];
    }
    return color;
}

function getRandomNeon() { // a random fully saturated colour from the magenta-to-cyan half of the wheel, as #rrggbb
    var hue = (180 + Math.floor(Math.random() * 121)) / 360; // 180 cyan .. 300 magenta
    var channel = function (t) { // HSL at 100% saturation and 50% lightness: a trapezoid wave around the hue circle
        if (t < 0) t += 1;
        if (t > 1) t -= 1;
        var v = t < 1 / 6 ? 6 * t : t < 1 / 2 ? 1 : t < 2 / 3 ? (2 / 3 - t) * 6 : 0;
        return ("0" + Math.round(v * 255).toString(16)).slice(-2);
    };
    return "#" + channel(hue + 1 / 3) + channel(hue) + channel(hue - 1 / 3);
}

function getRandomInteger(min, max) {
    return Math.floor(Math.random() * (max - min) ) + min;
}
