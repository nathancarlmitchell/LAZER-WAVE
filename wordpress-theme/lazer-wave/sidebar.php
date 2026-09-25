<?php
/**
 * The sidebar.
 *
 * @package Lazer_Wave
 */

if ( ! is_active_sidebar( 'sidebar-1' ) ) {
	return;
}
?>

<aside id="secondary" class="widget-area" aria-label="<?php esc_attr_e( 'Sidebar', 'lazer-wave' ); ?>">
	<?php dynamic_sidebar( 'sidebar-1' ); ?>
</aside>
