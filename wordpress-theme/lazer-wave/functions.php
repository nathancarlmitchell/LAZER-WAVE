<?php
/**
 * Lazer Wave theme setup: supports, menus, the sidebar, and the style and script.
 *
 * @package Lazer_Wave
 */

if ( ! defined( 'ABSPATH' ) ) {
	exit;
}

function lazer_wave_setup() {
	load_theme_textdomain( 'lazer-wave', get_template_directory() . '/languages' );

	add_theme_support( 'automatic-feed-links' );
	add_theme_support( 'title-tag' );
	add_theme_support( 'post-thumbnails' );
	add_theme_support( 'responsive-embeds' );
	add_theme_support( 'align-wide' );
	add_theme_support( 'html5', array( 'search-form', 'comment-form', 'comment-list', 'gallery', 'caption', 'style', 'script' ) );
	add_theme_support(
		'custom-logo',
		array(
			'height'      => 90,
			'width'       => 300,
			'flex-height' => true,
			'flex-width'  => true,
		)
	);

	register_nav_menus(
		array(
			'primary' => __( 'Primary Menu', 'lazer-wave' ),
			'footer'  => __( 'Footer Menu', 'lazer-wave' ),
		)
	);

	// The game's palette, offered to the block editor.
	add_theme_support(
		'editor-color-palette',
		array(
			array( 'name' => __( 'Ground', 'lazer-wave' ), 'slug' => 'lw-bg', 'color' => '#0a0014' ),
			array( 'name' => __( 'Text', 'lazer-wave' ), 'slug' => 'lw-text', 'color' => '#f2e9ff' ),
			array( 'name' => __( 'Dim', 'lazer-wave' ), 'slug' => 'lw-dim', 'color' => '#8a7a9e' ),
			array( 'name' => __( 'Cyan', 'lazer-wave' ), 'slug' => 'lw-cyan', 'color' => '#00ffff' ),
			array( 'name' => __( 'Magenta', 'lazer-wave' ), 'slug' => 'lw-magenta', 'color' => '#ff00ff' ),
			array( 'name' => __( 'Laser', 'lazer-wave' ), 'slug' => 'lw-laser', 'color' => '#ff2a6d' ),
			array( 'name' => __( 'Good', 'lazer-wave' ), 'slug' => 'lw-good', 'color' => '#48d1cc' ),
			array( 'name' => __( 'Late', 'lazer-wave' ), 'slug' => 'lw-late', 'color' => '#ffb020' ),
		)
	);
}
add_action( 'after_setup_theme', 'lazer_wave_setup' );

function lazer_wave_content_width() {
	$GLOBALS['content_width'] = apply_filters( 'lazer_wave_content_width', 780 );
}
add_action( 'after_setup_theme', 'lazer_wave_content_width', 0 );

function lazer_wave_widgets_init() {
	register_sidebar(
		array(
			'name'          => __( 'Sidebar', 'lazer-wave' ),
			'id'            => 'sidebar-1',
			'description'   => __( 'Widgets beside posts and archives.', 'lazer-wave' ),
			'before_widget' => '<section id="%1$s" class="widget %2$s">',
			'after_widget'  => '</section>',
			'before_title'  => '<h2 class="widget-title">',
			'after_title'   => '</h2>',
		)
	);
}
add_action( 'widgets_init', 'lazer_wave_widgets_init' );

function lazer_wave_scripts() {
	$version = wp_get_theme()->get( 'Version' );
	wp_enqueue_style( 'lazer-wave-style', get_stylesheet_uri(), array(), $version );
	wp_enqueue_script( 'lazer-wave-script', get_template_directory_uri() . '/js/lazer-wave.js', array(), $version, true );

	if ( is_singular() && comments_open() && get_option( 'thread_comments' ) ) {
		wp_enqueue_script( 'comment-reply' );
	}
}
add_action( 'wp_enqueue_scripts', 'lazer_wave_scripts' );

/**
 * The Japanese line under the site title. Filterable, so a site can set its own.
 */
function lazer_wave_title_jp() {
	return apply_filters( 'lazer_wave_title_jp', 'レーザーウェーブ' );
}

/**
 * The slogans that cycle over the title, as in the game's start screen.
 */
function lazer_wave_slogans() {
	return apply_filters(
		'lazer_wave_slogans',
		array(
			'Now in neon!', 'Feel the beat', 'Ride the wave', 'Stay in time', "Don't blink", 'Synthwave certified',
			'Lasers included', 'On the one', 'Off-beat is death', 'Now with rhythm', '波に乗れ', 'リズムを感じて', '光線注意',
		)
	);
}

/**
 * Posted-on and byline, for the entry meta.
 */
function lazer_wave_posted_on() {
	printf(
		'<span class="posted-on"><a href="%1$s" rel="bookmark"><time datetime="%2$s">%3$s</time></a></span> <span class="byline">// %4$s</span>',
		esc_url( get_permalink() ),
		esc_attr( get_the_date( DATE_W3C ) ),
		esc_html( get_the_date() ),
		'<a href="' . esc_url( get_author_posts_url( get_the_author_meta( 'ID' ) ) ) . '">' . esc_html( get_the_author() ) . '</a>'
	);
}

/**
 * Categories and tags as small framed tags.
 */
function lazer_wave_entry_tags() {
	$terms = array_merge( (array) get_the_category(), (array) get_the_tags() );
	foreach ( $terms as $term ) {
		if ( $term instanceof WP_Term ) {
			printf( '<a class="lw-tag" href="%1$s">%2$s</a>', esc_url( get_term_link( $term ) ), esc_html( $term->name ) );
		}
	}
}

/**
 * Menu fallback: a single HOME button rather than every page.
 */
function lazer_wave_menu_fallback() {
	printf(
		'<ul id="primary-menu" class="menu"><li class="%1$s"><a href="%2$s">%3$s</a></li></ul>',
		is_front_page() ? 'current-menu-item' : '',
		esc_url( home_url( '/' ) ),
		esc_html__( 'Home ホーム', 'lazer-wave' )
	);
}
