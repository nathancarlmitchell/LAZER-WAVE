// Lazer Wave theme: the start screen's motion, brought to the header. A slogan picked again every three seconds,
// the title's shadow flashing neon, a hover flash on buttons, the mobile menu, and an effects on/off switch.
// Everything that moves stops for prefers-reduced-motion or when the visitor turns effects off.
(function () {
    "use strict";

    var NEON = ["#00FFFF", "#ff00ff", "#48D1CC", "#4da6ff", "#ffb020", "#ff2a6d", "#39ff14"];
    var FX_KEY = "lazerWaveFx";
    var reduced = window.matchMedia ? window.matchMedia("(prefers-reduced-motion: reduce)") : null;
    var body = document.body;
    var timers = [];

    function neon() {
        return NEON[Math.floor(Math.random() * NEON.length)];
    }

    function fxOn() {
        return !body.classList.contains("lw-fx-off") && !(reduced && reduced.matches);
    }

    function readFx() { // storage can be missing or throw (private windows, blocked site data)
        try { return localStorage.getItem(FX_KEY); } catch (e) { return null; }
    }

    function writeFx(v) {
        try { localStorage.setItem(FX_KEY, v); } catch (e) { /* the switch still works for this page */ }
    }

    // the slogan
    var slogan = document.querySelector(".site-slogan");
    var slogans = [];
    if (slogan) {
        try { slogans = JSON.parse(slogan.getAttribute("data-slogans")) || []; } catch (e) { slogans = []; }
    }
    function nextSlogan() {
        if (slogan && slogans.length) {
            slogan.textContent = slogans[Math.floor(Math.random() * slogans.length)];
        }
    }

    // the title's stacked shadow, flashing a random neon
    var titles = document.querySelectorAll(".site-title a, .site-title .lw-title-stack");
    function flashTitle() {
        var c = neon();
        titles.forEach(function (t) { t.style.setProperty("--lw-shadow", c); });
    }
    function resetTitle() {
        titles.forEach(function (t) { t.style.removeProperty("--lw-shadow"); });
    }

    function start() {
        stop();
        if (!fxOn()) {
            return;
        }
        timers.push(setInterval(nextSlogan, 3000));
        timers.push(setInterval(flashTitle, 450));
    }
    function stop() {
        timers.forEach(clearInterval);
        timers = [];
        resetTitle();
    }

    // hover flash: each hover picks a fresh neon for the button's edge
    document.addEventListener("mouseover", function (e) {
        var b = e.target.closest && e.target.closest(".lw-button, button, .main-navigation a, .wp-block-button__link");
        if (b) {
            b.style.setProperty("--lw-flash", fxOn() ? neon() : "");
        }
    });

    // the mobile menu
    var nav = document.getElementById("site-navigation");
    var toggle = nav && nav.querySelector(".menu-toggle");
    if (toggle) {
        toggle.addEventListener("click", function () {
            var open = nav.classList.toggle("toggled");
            toggle.setAttribute("aria-expanded", open ? "true" : "false");
        });
    }

    // the effects switch in the footer
    var fxButton = document.querySelector(".lw-fx-toggle");
    function showFx() {
        var off = body.classList.contains("lw-fx-off");
        if (fxButton) {
            fxButton.textContent = off ? "Effects: Off" : "Effects: On";
            fxButton.setAttribute("aria-pressed", off ? "false" : "true");
        }
    }
    if (readFx() === "off") {
        body.classList.add("lw-fx-off");
    }
    if (fxButton) {
        fxButton.addEventListener("click", function () {
            var off = body.classList.toggle("lw-fx-off");
            writeFx(off ? "off" : "on");
            showFx();
            start();
        });
    }
    if (reduced && reduced.addEventListener) {
        reduced.addEventListener("change", start);
    }

    nextSlogan(); // a slogan shows even with effects off; it just doesn't change
    showFx();
    start();
})();
