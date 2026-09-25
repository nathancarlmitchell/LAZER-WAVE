<?php
/**
 * The main template: the blog, archives and search results.
 *
 * @package Lazer_Wave
 */

get_header();
?>

<div class="site-content<?php echo is_active_sidebar( 'sidebar-1' ) ? '' : ' no-sidebar'; ?>">
	<main id="primary" class="site-main">

		<?php if ( is_archive() ) : ?>
			<header class="page-header">
				<?php the_archive_title( '<h1 class="page-title">', '</h1>' ); ?>
				<?php the_archive_description( '<div class="archive-description">', '</div>' ); ?>
			</header>
		<?php elseif ( is_search() ) : ?>
			<header class="page-header">
				<h1 class="page-title">
					<?php
					/* translators: %s: search query. */
					printf( esc_html__( 'Results for %s', 'lazer-wave' ), '<span>' . get_search_query() . '</span>' );
					?>
				</h1>
				<span class="page-subtitle" lang="ja">検索結果</span>
			</header>
		<?php endif; ?>

		<?php if ( have_posts() ) : ?>

			<?php while ( have_posts() ) : the_post(); ?>
				<article id="post-<?php the_ID(); ?>" <?php post_class( 'lw-card' ); ?>>
					<header class="entry-header">
						<?php the_title( '<h2 class="entry-title"><a href="' . esc_url( get_permalink() ) . '" rel="bookmark">', '</a></h2>' ); ?>
						<?php if ( 'post' === get_post_type() ) : ?>
							<div class="entry-meta"><?php lazer_wave_posted_on(); ?></div>
						<?php endif; ?>
					</header>

					<?php if ( has_post_thumbnail() ) : ?>
						<a class="post-thumbnail" href="<?php the_permalink(); ?>" aria-hidden="true" tabindex="-1">
							<?php the_post_thumbnail( 'large' ); ?>
						</a>
					<?php endif; ?>

					<div class="entry-summary entry-content">
						<?php the_excerpt(); ?>
					</div>

					<footer class="entry-footer">
						<a class="lw-button" href="<?php the_permalink(); ?>"><?php esc_html_e( 'Read ▶', 'lazer-wave' ); ?><span class="screen-reader-text"> <?php the_title(); ?></span></a>
					</footer>
				</article>
			<?php endwhile; ?>

			<?php
			the_posts_pagination(
				array(
					'prev_text' => '&larr;',
					'next_text' => '&rarr;',
				)
			);
			?>

		<?php else : ?>

			<section class="no-results lw-card">
				<h2 class="entry-title"><?php esc_html_e( 'Nothing on this beat', 'lazer-wave' ); ?></h2>
				<p><?php esc_html_e( 'No posts matched. Try another search.', 'lazer-wave' ); ?></p>
				<?php get_search_form(); ?>
			</section>

		<?php endif; ?>

	</main>

	<?php get_sidebar(); ?>
</div>

<?php
get_footer();
