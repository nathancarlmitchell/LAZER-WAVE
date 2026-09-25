<?php
/**
 * The header: the start screen's slogan, stacked title and menu buttons.
 *
 * @package Lazer_Wave
 */
?><!DOCTYPE html>
<html <?php language_attributes(); ?>>
<head>
	<meta charset="<?php bloginfo( 'charset' ); ?>">
	<meta name="viewport" content="width=device-width, initial-scale=1">
	<meta name="theme-color" content="#0a0014">
	<?php wp_head(); ?>
</head>

<body <?php body_class(); ?>>
<?php wp_body_open(); ?>
<div id="page" class="site">
	<a class="skip-link screen-reader-text" href="#primary"><?php esc_html_e( 'Skip to content', 'lazer-wave' ); ?></a>

	<header id="masthead" class="site-header">
		<div class="site-header-inner">
			<?php the_custom_logo(); ?>

			<span class="site-slogan" aria-hidden="true" data-slogans="<?php echo esc_attr( wp_json_encode( lazer_wave_slogans() ) ); ?>"></span>

			<?php $title_tag = ( is_front_page() && is_home() ) ? 'h1' : 'p'; ?>
			<<?php echo $title_tag; ?> class="site-title">
				<a href="<?php echo esc_url( home_url( '/' ) ); ?>" rel="home"><?php bloginfo( 'name' ); ?></a>
				<span class="site-title-jp" lang="ja"><span class="lw-title-stack"><?php echo esc_html( lazer_wave_title_jp() ); ?></span></span>
			</<?php echo $title_tag; ?>>

			<?php
			$description = get_bloginfo( 'description', 'display' );
			if ( $description ) :
				?>
				<p class="site-description"><?php echo $description; // phpcs:ignore WordPress.Security.EscapeOutput.OutputNotEscaped ?></p>
			<?php endif; ?>

			<nav id="site-navigation" class="main-navigation" aria-label="<?php esc_attr_e( 'Primary', 'lazer-wave' ); ?>">
				<button class="menu-toggle" aria-controls="primary-menu" aria-expanded="false"><?php esc_html_e( 'Menu メニュー', 'lazer-wave' ); ?></button>
				<?php
				wp_nav_menu(
					array(
						'theme_location' => 'primary',
						'menu_id'        => 'primary-menu',
						'container'      => false,
						'depth'          => 2,
						'fallback_cb'    => 'lazer_wave_menu_fallback',
					)
				);
				?>
			</nav>
		</div>
	</header>
