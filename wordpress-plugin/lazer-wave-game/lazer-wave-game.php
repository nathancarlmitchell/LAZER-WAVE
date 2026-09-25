<?php
/**
 * Plugin Name:       Lazer Wave Game
 * Plugin URI:        https://github.com/nathancarlmitchell/Lazer-Wave
 * Description:       Play Lazer Wave, the neon rhythm arcade game, on your site. Add the "Lazer Wave Game" block or the [lazer_wave] shortcode to any post or page.
 * Version:           1.1.0
 * Requires at least: 6.1
 * Requires PHP:      7.4
 * Author:            Nathan Mitchell
 * License:           GPL-2.0-or-later
 * License URI:       https://www.gnu.org/licenses/gpl-2.0.html
 * Text Domain:       lazer-wave-game
 *
 * @package Lazer_Wave_Game
 */

if ( ! defined( 'ABSPATH' ) ) {
	exit;
}

define( 'LAZER_WAVE_GAME_VERSION', '1.1.0' ); // also busts the cache of the game's own files (see build.js)

/**
 * The game runs in an iframe of its own: it is a full-window canvas built from plain global scripts, so it keeps its
 * own page, its own resize and its own keys, and nothing on the site can restyle it or collide with its globals.
 */
function lazer_wave_game_url() {
	return add_query_arg( 'ver', LAZER_WAVE_GAME_VERSION, plugins_url( 'game/index.html', __FILE__ ) );
}

/**
 * The embed: a 16:10 frame (the game lays out for 1280x800), a fullscreen button and a link to the game on its own.
 *
 * @param array $args aspect ("16:10", "16:9", "4:3"), align ("", "wide", "full"), controls (bool).
 */
function lazer_wave_game_render( $args = array() ) {
	$args = wp_parse_args(
		$args,
		array(
			'aspect'   => '16:10',
			'align'    => '',
			'controls' => true,
		)
	);

	$aspects = array(
		'16:10' => '16 / 10',
		'16:9'  => '16 / 9',
		'4:3'   => '4 / 3',
	);
	$aspect  = isset( $aspects[ $args['aspect'] ] ) ? $aspects[ $args['aspect'] ] : $aspects['16:10'];
	$align   = in_array( $args['align'], array( 'wide', 'full' ), true ) ? ' align' . $args['align'] : '';
	$controls = filter_var( $args['controls'], FILTER_VALIDATE_BOOLEAN );
	$id      = wp_unique_id( 'lazer-wave-' );
	$src     = lazer_wave_game_url();

	wp_enqueue_style( 'lazer-wave-game' );
	wp_enqueue_script( 'lazer-wave-game' );

	ob_start();
	?>
	<figure class="lazer-wave-game<?php echo esc_attr( $align ); ?>">
		<div class="lazer-wave-game__frame" style="aspect-ratio: <?php echo esc_attr( $aspect ); ?>;">
			<iframe
				id="<?php echo esc_attr( $id ); ?>"
				src="<?php echo esc_url( $src ); ?>"
				title="<?php esc_attr_e( 'Lazer Wave — a rhythm arcade game', 'lazer-wave-game' ); ?>"
				allow="fullscreen; autoplay"
				allowfullscreen
				loading="lazy"
			></iframe>
		</div>
		<?php if ( $controls ) : ?>
			<figcaption class="lazer-wave-game__bar">
				<span class="lazer-wave-game__hint"><?php esc_html_e( 'Click the game to play. Z and X hit the beats in their colours, Space takes the gates and overdrive, P pauses.', 'lazer-wave-game' ); ?></span>
				<span class="lazer-wave-game__buttons">
					<button type="button" class="lazer-wave-game__fullscreen" data-target="<?php echo esc_attr( $id ); ?>" hidden><?php esc_html_e( 'Fullscreen', 'lazer-wave-game' ); ?></button>
					<a class="lazer-wave-game__open" href="<?php echo esc_url( $src ); ?>" target="_blank" rel="noopener"><?php esc_html_e( 'Open in a new window', 'lazer-wave-game' ); ?></a>
				</span>
			</figcaption>
		<?php endif; ?>
	</figure>
	<?php
	return ob_get_clean();
}

function lazer_wave_game_register() {
	wp_register_style( 'lazer-wave-game', plugins_url( 'assets/embed.css', __FILE__ ), array(), LAZER_WAVE_GAME_VERSION );
	wp_register_script( 'lazer-wave-game', plugins_url( 'assets/embed.js', __FILE__ ), array(), LAZER_WAVE_GAME_VERSION, true );

	// [lazer_wave aspect="16:10" align="wide" controls="true"]
	add_shortcode(
		'lazer_wave',
		function ( $atts ) {
			return lazer_wave_game_render( shortcode_atts( array( 'aspect' => '16:10', 'align' => '', 'controls' => 'true' ), $atts, 'lazer_wave' ) );
		}
	);

	register_block_type( __DIR__ . '/block' );
}
add_action( 'init', 'lazer_wave_game_register' );

/**
 * Tell the admin if the game files were never built into the plugin (see build.js next to this folder).
 */
function lazer_wave_game_missing_notice() {
	if ( file_exists( __DIR__ . '/game/index.html' ) || ! current_user_can( 'activate_plugins' ) ) {
		return;
	}
	echo '<div class="notice notice-error"><p>' . esc_html__( 'Lazer Wave Game: the game files are missing from the plugin\'s game/ folder. Rebuild the plugin zip with build.js and upload it again.', 'lazer-wave-game' ) . '</p></div>';
}
add_action( 'admin_notices', 'lazer_wave_game_missing_notice' );
