// The Lazer Wave Leaderboard block in the editor: which board, on which difficulty, how many, and the board itself as
// the page will show it (rendered on the server). Plain JS on window.wp, no build step.
(function (wp) {
    "use strict";

    var el = wp.element.createElement;
    var __ = wp.i18n.__;
    var useBlockProps = wp.blockEditor.useBlockProps;
    var InspectorControls = wp.blockEditor.InspectorControls;
    var PanelBody = wp.components.PanelBody;
    var SelectControl = wp.components.SelectControl;
    var RangeControl = wp.components.RangeControl;
    var ServerSideRender = wp.serverSideRender;

    wp.blocks.registerBlockType("lazer-wave/scores", {
        edit: function (props) {
            var a = props.attributes;
            return el("div", useBlockProps(),
                el(InspectorControls, null,
                    el(PanelBody, { title: __("Leaderboard", "lazer-wave-game") },
                        el(SelectControl, {
                            label: __("Board", "lazer-wave-game"),
                            value: a.board,
                            options: [
                                { label: __("Run total (from START)", "lazer-wave-game"), value: "run" },
                                { label: __("Boss rush total", "lazer-wave-game"), value: "rush" },
                                { label: __("A level, played on its own", "lazer-wave-game"), value: "level" },
                            ],
                            onChange: function (v) { props.setAttributes({ board: v }); },
                        }),
                        a.board == "level" ? el(RangeControl, {
                            label: __("Level", "lazer-wave-game"),
                            value: a.level,
                            min: 1,
                            max: 25,
                            onChange: function (v) { props.setAttributes({ level: v || 1 }); },
                        }) : null,
                        el(SelectControl, {
                            label: __("Difficulty", "lazer-wave-game"),
                            value: a.difficulty,
                            options: [
                                { label: "EASY", value: "easy" },
                                { label: "NORMAL", value: "normal" },
                                { label: "HARD", value: "hard" },
                                { label: "TRUE", value: "true" },
                            ],
                            onChange: function (v) { props.setAttributes({ difficulty: v }); },
                        }),
                        el(RangeControl, {
                            label: __("Scores shown", "lazer-wave-game"),
                            value: a.limit,
                            min: 3,
                            max: 50,
                            onChange: function (v) { props.setAttributes({ limit: v || 10 }); },
                        })
                    )
                ),
                el(ServerSideRender, { block: "lazer-wave/scores", attributes: a })
            );
        },
        save: function () {
            return null; // rendered on the server by render.php
        },
    });
})(window.wp);
