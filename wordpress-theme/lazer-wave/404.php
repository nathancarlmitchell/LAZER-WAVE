<?php
/**
 * Not found: a missed beat.
 *
 * @package Lazer_Wave
 */

get_header();
?>

<div class="site-content no-sidebar">
	<main id="primary" class="site-main">
		<section class="error-404 not-found">
			<span class="lw-miss">MISS</span>
			<h1 class="page-title"><?php esc_html_e( '404 — Off the beat', 'lazer-wave' ); ?></h1>
			<span class="page-subtitle" lang="ja">ビートを逃した</span>
			<p><?php esc_html_e( 'That page took a laser. Your combo is reset, but you still have shields.', 'lazer-wave' ); ?></p>
			<?php get_search_form(); ?>
			<a class="lw-button lw-button-start" href="<?php echo esc_url( home_url( '/' ) ); ?>"><?php esc_html_e( 'Retry', 'lazer-wave' ); ?></a>
		</section>
	</main>
</div>

<?php
get_footer();
