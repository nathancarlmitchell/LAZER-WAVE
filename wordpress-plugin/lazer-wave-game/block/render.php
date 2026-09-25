<?php
/**
 * The Lazer Wave Game block, rendered on the server: the same embed as the shortcode.
 *
 * @var array $attributes The block's attributes.
 *
 * @package Lazer_Wave_Game
 */

if ( ! defined( 'ABSPATH' ) ) {
	exit;
}

echo lazer_wave_game_render( // phpcs:ignore WordPress.Security.EscapeOutput.OutputNotEscaped -- escaped inside
	array(
		'aspect'   => isset( $attributes['aspect'] ) ? $attributes['aspect'] : '16:10',
		'align'    => isset( $attributes['align'] ) ? $attributes['align'] : '',
		'controls' => ! isset( $attributes['controls'] ) || $attributes['controls'],
	)
);
