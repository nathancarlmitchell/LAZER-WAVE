<?php
/**
 * The search form.
 *
 * @package Lazer_Wave
 */

$lazer_wave_search_id = wp_unique_id( 'search-form-' );
?>
<form role="search" method="get" class="search-form" action="<?php echo esc_url( home_url( '/' ) ); ?>">
	<label for="<?php echo esc_attr( $lazer_wave_search_id ); ?>">
		<span class="screen-reader-text"><?php esc_html_e( 'Search for:', 'lazer-wave' ); ?></span>
		<input type="search" id="<?php echo esc_attr( $lazer_wave_search_id ); ?>" class="search-field" placeholder="<?php esc_attr_e( 'Search 検索…', 'lazer-wave' ); ?>" value="<?php echo get_search_query(); ?>" name="s">
	</label>
	<button type="submit" class="search-submit"><?php esc_html_e( 'Search', 'lazer-wave' ); ?></button>
</form>
