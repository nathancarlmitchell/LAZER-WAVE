<?php
/**
 * The footer.
 *
 * @package Lazer_Wave
 */
?>
	<footer id="colophon" class="site-footer">
		<?php
		if ( has_nav_menu( 'footer' ) ) {
			wp_nav_menu(
				array(
					'theme_location' => 'footer',
					'container'      => 'nav',
					'depth'          => 1,
					'menu_class'     => 'footer-menu',
				)
			);
		}
		?>
		<p>&copy; <?php echo esc_html( gmdate( 'Y' ) ); ?> <a href="<?php echo esc_url( home_url( '/' ) ); ?>"><?php bloginfo( 'name' ); ?></a> &middot; <?php esc_html_e( 'Stay in time', 'lazer-wave' ); ?></p>
		<button type="button" class="lw-fx-toggle" aria-pressed="true"><?php esc_html_e( 'Effects: On', 'lazer-wave' ); ?></button>
	</footer>
</div><!-- #page -->

<?php wp_footer(); ?>
</body>
</html>
