<?php
/**
 * The Lazer Wave Leaderboard block, rendered on the server: the same board as the [lazer_wave_scores] shortcode, in
 * the block's own wrapper (its alignment and any class the editor gave it).
 *
 * @var array $attributes The block's attributes.
 *
 * @package Lazer_Wave_Game
 */

if ( ! defined( 'ABSPATH' ) ) {
	exit;
}

$lazer_wave_board = isset( $attributes['board'] ) ? $attributes['board'] : 'run';
if ( 'level' === $lazer_wave_board ) {
	$lazer_wave_board = 'level-' . ( isset( $attributes['level'] ) ? absint( $attributes['level'] ) : 1 );
}
$lazer_wave_scores = lazer_wave_scores_render(
	array(
		'board'      => $lazer_wave_board,
		'difficulty' => isset( $attributes['difficulty'] ) ? $attributes['difficulty'] : 'normal',
		'limit'      => isset( $attributes['limit'] ) ? (int) $attributes['limit'] : 10,
	)
);
if ( '' !== $lazer_wave_scores ) {
	printf( '<div %s>%s</div>', get_block_wrapper_attributes(), $lazer_wave_scores ); // phpcs:ignore WordPress.Security.EscapeOutput.OutputNotEscaped -- escaped inside
}
