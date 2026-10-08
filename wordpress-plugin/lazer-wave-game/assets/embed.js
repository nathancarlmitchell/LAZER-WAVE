// The Lazer Wave embed: the fullscreen button. Shown only where the browser can put an element in fullscreen (not on
// iPhone Safari, which can't); "Open in a new window" is always there as the fallback. And while a level is being
// played in a game on the page, the page's own menu and a middle click's scrolling held back, so a right click (the
// game's MAGENTA) or a middle click (its GATE) that lands outside the frame, the cursor strayed past its edge, opens
// nothing: the game says when it is playing (tellHost, the game's input.js).
(function () {
    "use strict";

    var frames = Array.prototype.slice.call(document.querySelectorAll(".lazer-wave-game__frame iframe"));
    var playing = []; // the frames whose games are playing a level now

    function stopPlaying(frame) {
        playing = playing.filter(function (f) { return f !== frame; });
    }

    window.addEventListener("message", function (e) {
        var data = e.data;
        if (!data || data.lazerWave !== "playing") {
            return;
        }
        frames.forEach(function (frame) {
            if (frame.contentWindow === e.source) {
                stopPlaying(frame);
                if (data.playing) {
                    playing.push(frame);
                }
            }
        });
    });
    frames.forEach(function (frame) { // a game loaded again starts out not playing
        frame.addEventListener("load", function () { stopPlaying(frame); });
    });
    window.addEventListener("contextmenu", function (e) {
        if (playing.length) {
            e.preventDefault();
        }
    }, true);
    ["mousedown", "auxclick"].forEach(function (type) { // the middle button's scrolling, and its opening a link
        window.addEventListener(type, function (e) {
            if (playing.length && e.button === 1) {
                e.preventDefault();
            }
        }, true);
    });

    function fullscreenOf(el) {
        return el.requestFullscreen || el.webkitRequestFullscreen || null;
    }

    document.querySelectorAll(".lazer-wave-game__fullscreen").forEach(function (button) {
        var frame = document.getElementById(button.getAttribute("data-target"));
        var enter = frame && fullscreenOf(frame);
        if (!enter) {
            return;
        }
        button.hidden = false;
        button.addEventListener("click", function () {
            var done = enter.call(frame);
            if (done && done.then) {
                done.then(function () { frame.focus(); }, function () { /* refused: the page stays as it was */ });
            } else {
                frame.focus();
            }
        });
    });
})();
