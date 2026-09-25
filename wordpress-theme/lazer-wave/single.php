<?php
/**
 * A single post.
 *
 * @package Lazer_Wave
 */

get_header();
?>

<div class="site-content<?php echo is_active_sidebar( 'sidebar-1' ) ? '' : ' no-sidebar'; ?>">
	<main id="primary" class="site-main">

		<?php while ( have_posts() ) : the_post(); ?>
			<article id="post-<?php the_ID(); ?>" <?php post_class(); ?>>
				<header class="entry-header">
					<?php the_title( '<h1 class="entry-title">', '</h1>' ); ?>
					<div class="entry-meta"><?php lazer_wave_posted_on(); ?></div>
				</header>

				<?php if ( has_post_thumbnail() ) : ?>
					<div class="post-thumbnail"><?php the_post_thumbnail( 'large' ); ?></div>
				<?php endif; ?>

				<div class="entry-content">
					<?php
					the_content();
					wp_link_pages(
						array(
							'before' => '<div class="page-links">' . esc_html__( 'Pages:', 'lazer-wave' ),
							'after'  => '</div>',
						)
					);
					?>
				</div>

				<footer class="entry-footer">
					<?php lazer_wave_entry_tags(); ?>
				</footer>
			</article>

			<hr>

			<?php
			the_post_navigation(
				array(
					'prev_text' => '<span class="nav-subtitle">' . esc_html__( '← Previous', 'lazer-wave' ) . '</span> %title',
					'next_text' => '<span class="nav-subtitle">' . esc_html__( 'Next →', 'lazer-wave' ) . '</span> %title',
				)
			);

			if ( comments_open() || get_comments_number() ) {
				comments_template();
			}
			?>
		<?php endwhile; ?>

	</main>

	<?php get_sidebar(); ?>
</div>

<?php
get_footer();
