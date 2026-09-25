<?php
/**
 * Comments.
 *
 * @package Lazer_Wave
 */

if ( post_password_required() ) {
	return;
}
?>

<section id="comments" class="comments-area">
	<?php if ( have_comments() ) : ?>
		<h2 class="comments-title">
			<?php
			$lazer_wave_count = get_comments_number();
			/* translators: %s: number of comments. */
			printf( esc_html( _n( '%s comment', '%s comments', $lazer_wave_count, 'lazer-wave' ) ), esc_html( number_format_i18n( $lazer_wave_count ) ) );
			?>
			<span class="page-subtitle" lang="ja">コメント</span>
		</h2>

		<ol class="comment-list">
			<?php
			wp_list_comments(
				array(
					'style'       => 'ol',
					'short_ping'  => true,
					'avatar_size' => 48,
				)
			);
			?>
		</ol>

		<?php the_comments_navigation(); ?>

		<?php if ( ! comments_open() ) : ?>
			<p class="no-comments"><?php esc_html_e( 'Comments are closed.', 'lazer-wave' ); ?></p>
		<?php endif; ?>
	<?php endif; ?>

	<?php
	comment_form(
		array(
			'title_reply'  => esc_html__( 'Leave a comment', 'lazer-wave' ),
			'label_submit' => esc_html__( 'Post comment', 'lazer-wave' ),
		)
	);
	?>
</section>
