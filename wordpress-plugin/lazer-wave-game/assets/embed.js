// The Lazer Wave embed: the fullscreen button. Shown only where the browser can put an element in fullscreen (not on
// iPhone Safari, which can't); "Open in a new window" is always there as the fallback.
(function () {
    "use strict";

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
