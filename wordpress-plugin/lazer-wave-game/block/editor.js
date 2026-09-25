// The Lazer Wave Game block in the editor: a placeholder and two settings. Plain JS on window.wp, no build step. The
// game itself only runs on the published page, so the editor never starts its music or takes its keys.
(function (wp) {
    "use strict";

    var el = wp.element.createElement;
    var __ = wp.i18n.__;
    var useBlockProps = wp.blockEditor.useBlockProps;
    var InspectorControls = wp.blockEditor.InspectorControls;
    var PanelBody = wp.components.PanelBody;
    var SelectControl = wp.components.SelectControl;
    var ToggleControl = wp.components.ToggleControl;

    wp.blocks.registerBlockType("lazer-wave/game", {
        edit: function (props) {
            var a = props.attributes;
            var ratio = { "16:10": "16 / 10", "16:9": "16 / 9", "4:3": "4 / 3" }[a.aspect] || "16 / 10";

            return el("div", useBlockProps(),
                el(InspectorControls, null,
                    el(PanelBody, { title: __("Game", "lazer-wave-game") },
                        el(SelectControl, {
                            label: __("Aspect ratio", "lazer-wave-game"),
                            value: a.aspect,
                            options: [
                                { label: "16:10 (the game's own)", value: "16:10" },
                                { label: "16:9", value: "16:9" },
                                { label: "4:3", value: "4:3" },
                            ],
                            onChange: function (v) { props.setAttributes({ aspect: v }); },
                        }),
                        el(ToggleControl, {
                            label: __("Show the controls bar", "lazer-wave-game"),
                            checked: a.controls,
                            onChange: function (v) { props.setAttributes({ controls: v }); },
                        })
                    )
                ),
                el("div", {
                    style: {
                        aspectRatio: ratio, background: "#0a0014", border: "2px solid #00ffff", display: "flex",
                        flexDirection: "column", alignItems: "center", justifyContent: "center", fontFamily: "Arial, sans-serif",
                    },
                },
                    el("div", { style: { color: "#ff00ff", fontSize: "48px", textShadow: "-3px -3px 0 #00ffff" } }, "LAZER WAVE"),
                    el("div", { style: { color: "#8a7a9e", marginTop: "8px" } }, __("The game plays on the published page.", "lazer-wave-game"))
                )
            );
        },
        save: function () {
            return null; // rendered on the server by render.php
        },
    });
})(window.wp);
