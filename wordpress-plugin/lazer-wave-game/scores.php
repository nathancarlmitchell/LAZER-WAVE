<?php
/**
 * Lazer Wave Game: the online leaderboards. Players post their own scores from the game, on boards kept per difficulty:
 * a full run's total ("run"), a boss rush's total ("rush"), and each level played on its own from the level select
 * ("level-1" to "level-25"), each score with its play's MAX COMBO. Anyone can post, under a name they type, and a score
 * shows at once; the Tools menu has a screen to hide or delete one.
 *
 * A browser game's score can always be forged, so the site makes it hard to do grossly: the game asks for a signed,
 * timed ticket as a run or a level starts, and a score must come back with it, once, no sooner than the songs of the
 * levels it claims to have cleared could have played, and no higher than those levels could give (both worked out
 * from the game's own levels by build.js, into game/scores-limits.json). Posting and asking for tickets are
 * rate-limited by address (kept only as a salted hash), and a name is held to the site's Disallowed Comment Keys.
 *
 * Routes, under /wp-json/lazer-wave/v1/: GET scores?board=&difficulty=&limit= (a board), POST tickets {board,
 * difficulty, version} (a ticket), POST scores {ticket, name, score, reached, combo, grade} (a score, with its place).
 *
 * @package Lazer_Wave_Game
 */

if ( ! defined( 'ABSPATH' ) ) {
	exit;
}

define( 'LAZER_WAVE_SCORES_DB', 2 ); // the scores table's layout: a change to it is made on the next page load (2: combo)
define( 'LAZER_WAVE_SCORES_TOP', 10 ); // how long a board is shown, by default
define( 'LAZER_WAVE_SCORES_NAME_MAX', 20 ); // characters in a name, at most

/**
 * The scores table's name.
 */
function lazer_wave_scores_table() {
	global $wpdb;
	return $wpdb->prefix . 'lazer_wave_scores';
}

/**
 * Make the scores table, or bring it up to date: on activation, and on the first load after an update changes it
 * (activation hooks don't run on updates).
 */
function lazer_wave_scores_install() {
	global $wpdb;
	require_once ABSPATH . 'wp-admin/includes/upgrade.php';
	$table   = lazer_wave_scores_table();
	$charset = $wpdb->get_charset_collate();
	dbDelta(
		"CREATE TABLE {$table} (
			id bigint(20) unsigned NOT NULL AUTO_INCREMENT,
			board varchar(16) NOT NULL,
			difficulty varchar(8) NOT NULL,
			name varchar(32) NOT NULL,
			score bigint(20) unsigned NOT NULL,
			reached smallint(5) unsigned NOT NULL DEFAULT 0,
			combo smallint(5) unsigned DEFAULT NULL,
			grade varchar(4) NOT NULL DEFAULT '',
			seconds int(10) unsigned NOT NULL DEFAULT 0,
			version smallint(5) unsigned NOT NULL DEFAULT 1,
			ip_hash char(64) NOT NULL DEFAULT '',
			hidden tinyint(1) NOT NULL DEFAULT 0,
			created datetime NOT NULL,
			PRIMARY KEY  (id),
			KEY board_rank (board,difficulty,version,hidden,score)
		) {$charset};"
	);
	update_option( 'lazer_wave_scores_db', LAZER_WAVE_SCORES_DB );
}

/**
 * On every load: the table brought up to date if a version of the plugin needs it changed.
 */
function lazer_wave_scores_upgrade() {
	if ( (int) get_option( 'lazer_wave_scores_db' ) !== LAZER_WAVE_SCORES_DB ) {
		lazer_wave_scores_install();
	}
}
add_action( 'plugins_loaded', 'lazer_wave_scores_upgrade' );

/**
 * What the game can give, written by build.js from the game's own levels and scoring: the scoring version the boards
 * are kept under, the points and lives of each difficulty, and each level's bars, tempo, act, name and boss. Empty if
 * the plugin was never built, and then the boards are closed.
 *
 * @return array
 */
function lazer_wave_scores_limits() {
	static $limits = null;
	if ( null === $limits ) {
		$file   = __DIR__ . '/game/scores-limits.json';
		$limits = file_exists( $file ) ? json_decode( (string) file_get_contents( $file ), true ) : null; // phpcs:ignore WordPress.WP.AlternativeFunctions.file_get_contents_file_get_contents -- a file of the plugin's own
		if ( ! is_array( $limits ) || empty( $limits['levels'] ) || empty( $limits['points'] ) ) {
			$limits = array();
		}
	}
	return $limits;
}

/**
 * The scoring version the boards are kept under: scores posted under another are kept, but not shown.
 */
function lazer_wave_scores_version() {
	$limits = lazer_wave_scores_limits();
	return isset( $limits['version'] ) ? (int) $limits['version'] : 1;
}

/**
 * The levels a board's run goes through, in order: every level for "run", the bosses for "rush", the one level for a
 * level's board.
 *
 * @param string $board The board.
 * @return int[]
 */
function lazer_wave_scores_levels( $board ) {
	$limits = lazer_wave_scores_limits();
	if ( empty( $limits['levels'] ) ) {
		return array();
	}
	$all = array_map( 'intval', array_keys( $limits['levels'] ) );
	sort( $all );
	if ( 'run' === $board ) {
		return $all;
	}
	if ( 'rush' === $board ) {
		return array_values(
			array_filter(
				$all,
				function ( $n ) use ( $limits ) {
					return ! empty( $limits['levels'][ $n ]['boss'] );
				}
			)
		);
	}
	if ( preg_match( '/^level-(\d{1,2})$/', (string) $board, $m ) && isset( $limits['levels'][ (int) $m[1] ] ) ) {
		return array( (int) $m[1] );
	}
	return array();
}

/**
 * Is a board one there is: "run", "rush" or "level-n" for a level the game has.
 *
 * @param string $board The board.
 */
function lazer_wave_scores_board_ok( $board ) {
	return count( lazer_wave_scores_levels( $board ) ) > 0;
}

/**
 * Is a difficulty one the game has.
 *
 * @param string $difficulty The difficulty: "easy", "normal", "hard" or "true".
 */
function lazer_wave_scores_difficulty_ok( $difficulty ) {
	$limits = lazer_wave_scores_limits();
	return is_string( $difficulty ) && isset( $limits['points'][ $difficulty ] );
}

/**
 * The most a board's play could have scored, having cleared `$reached` of its levels (and played into the next): every
 * beat a PERFECT in overdrive, as many lasers absorbed on each as could be, the multiplier climbing from the first beat
 * without a break, and every boss paying all it can; on a run or a rush, as many times over as the difficulty has lives,
 * since a death there keeps the points already scored and plays the level again. Far more than anyone scores: it is
 * there to refuse a number no play could have made.
 *
 * @param string $board      The board.
 * @param string $difficulty The difficulty.
 * @param int    $reached    Levels cleared: of the run's, the rush's bosses, or 1 for a level's board.
 * @return int
 */
function lazer_wave_scores_cap( $board, $difficulty, $reached ) {
	$limits = lazer_wave_scores_limits();
	$levels = lazer_wave_scores_levels( $board );
	$single = 0 === strpos( $board, 'level-' );
	if ( ! $single ) {
		$levels = array_slice( $levels, 0, min( count( $levels ), max( 0, (int) $reached ) + 1 ) );
	}
	$step  = max( 1, (int) $limits['combo_step'] );
	$beat  = ( (int) $limits['perfect'] + (int) $limits['absorb'] * (int) $limits['absorbs_per_beat'] ) * (int) $limits['overdrive'];
	$total = 0.0;
	$combo = 0;
	foreach ( $levels as $n ) {
		$def   = $limits['levels'][ $n ];
		$beats = (int) $def['bars'] * (int) $limits['beats_per_bar'];
		for ( $b = 0; $b < $beats; $b++ ) {
			$combo++;
			$total += $beat * ( 1 + intdiv( $combo, $step ) ) + (int) $limits['survive'];
		}
		if ( ! empty( $def['boss'] ) ) {
			$total += (int) $limits['boss_bonus'] * (int) $def['act'] * ( 1 + intdiv( $combo, $step ) );
		}
	}
	$tries = $single ? 1 : 1 + (int) $limits['lives'][ $difficulty ];
	return (int) ceil( $total * (float) $limits['points'][ $difficulty ] * $tries ) + 1000;
}

/**
 * The fewest seconds the levels a board's play claims to have cleared could have taken: half the song of a level
 * without a boss, which always plays to its end; for a boss level, only its count-in and a tenth of its bars, as lasers
 * absorbed in overdrive hurt the boss too, and an overdrive carried in from the level before can bring it down within a
 * fifth of its song. Time on the results and the story screens only adds to it.
 *
 * @param string $board   The board.
 * @param int    $reached Levels cleared.
 * @return int
 */
function lazer_wave_scores_min_seconds( $board, $reached ) {
	$limits  = lazer_wave_scores_limits();
	$cleared = array_slice( lazer_wave_scores_levels( $board ), 0, max( 0, (int) $reached ) );
	$seconds = 0.0;
	foreach ( $cleared as $n ) {
		$def      = $limits['levels'][ $n ];
		$bars     = ! empty( $def['boss'] ) ? (int) $limits['count_in_bars'] + 0.1 * (int) $def['bars'] : 0.5 * ( (int) $limits['count_in_bars'] + (int) $def['bars'] );
		$seconds += $bars * (int) $limits['beats_per_bar'] * 60 / max( 1, (float) $def['bpm'] );
	}
	return (int) floor( $seconds );
}

/**
 * The longest combo a board's play could have had: twice the beats of the longest level it played, as a boss level's
 * streak can run on into a round after the first. The combo isn't ranked, so one over it is held to it, not refused.
 *
 * @param string $board   The board.
 * @param int    $reached Levels cleared.
 * @return int
 */
function lazer_wave_scores_combo_cap( $board, $reached ) {
	$limits = lazer_wave_scores_limits();
	$levels = lazer_wave_scores_levels( $board );
	if ( 0 !== strpos( $board, 'level-' ) ) {
		$levels = array_slice( $levels, 0, min( count( $levels ), max( 0, (int) $reached ) + 1 ) );
	}
	$most = 0;
	foreach ( $levels as $n ) {
		$most = max( $most, (int) $limits['levels'][ $n ]['bars'] * (int) $limits['beats_per_bar'] );
	}
	return 2 * $most;
}

/**
 * The address a request came from, kept only as a salted hash: for the rate limits, and to tell the admin which
 * scores came from the same place.
 */
function lazer_wave_scores_ip_hash() {
	$ip = isset( $_SERVER['REMOTE_ADDR'] ) ? sanitize_text_field( wp_unslash( $_SERVER['REMOTE_ADDR'] ) ) : '';
	return hash( 'sha256', $ip . wp_salt( 'nonce' ) );
}

/**
 * Count one more `$what` from this address, and say whether it is within `$max` in `$window` seconds.
 *
 * @param string $what   What is counted: "ticket" or "post".
 * @param int    $max    How many are allowed.
 * @param int    $window Over how many seconds.
 */
function lazer_wave_scores_rate_ok( $what, $max, $window ) {
	$key   = 'lw_rate_' . $what . '_' . substr( lazer_wave_scores_ip_hash(), 0, 32 );
	$count = (int) get_transient( $key );
	if ( $count >= $max ) {
		return false;
	}
	set_transient( $key, $count + 1, $window );
	return true;
}

/**
 * The secret tickets are signed with, made once and kept.
 */
function lazer_wave_scores_secret() {
	$secret = get_option( 'lazer_wave_scores_secret' );
	if ( ! $secret ) {
		$secret = wp_generate_password( 64, true, true );
		update_option( 'lazer_wave_scores_secret', $secret, false );
	}
	return $secret;
}

/**
 * A ticket for a play of `$board` on `$difficulty`, starting now: what it is for, when it was given and a nonce of its
 * own, signed so the game can't write one itself.
 *
 * @param string $board      The board.
 * @param string $difficulty The difficulty.
 */
function lazer_wave_scores_make_ticket( $board, $difficulty ) {
	$payload = wp_json_encode(
		array(
			'b' => $board,
			'd' => $difficulty,
			't' => time(),
			'n' => wp_generate_password( 20, false, false ),
		)
	);
	$data = rtrim( strtr( base64_encode( $payload ), '+/', '-_' ), '=' ); // phpcs:ignore WordPress.PHP.DiscouragedPHPFunctions.obfuscation_base64_encode -- a URL-safe token, not obfuscation
	return $data . '.' . hash_hmac( 'sha256', $data, lazer_wave_scores_secret() );
}

/**
 * A ticket read back, if it is one the site signed: array with b (board), d (difficulty), t (when) and n (nonce).
 *
 * @param string $ticket The ticket.
 * @return array|null
 */
function lazer_wave_scores_read_ticket( $ticket ) {
	$parts = explode( '.', (string) $ticket );
	if ( 2 !== count( $parts ) || ! hash_equals( hash_hmac( 'sha256', $parts[0], lazer_wave_scores_secret() ), $parts[1] ) ) {
		return null;
	}
	$data = json_decode( (string) base64_decode( strtr( $parts[0], '-_', '+/' ) ), true ); // phpcs:ignore WordPress.PHP.DiscouragedPHPFunctions.obfuscation_base64_decode -- reading our own token
	if ( ! is_array( $data ) || ! isset( $data['b'], $data['d'], $data['t'], $data['n'] ) ) {
		return null;
	}
	return $data;
}

/**
 * A name as it will be shown, or why it can't be: 1 to LAZER_WAVE_SCORES_NAME_MAX letters, digits, spaces and a few
 * marks, and nothing the site's Disallowed Comment Keys (Settings > Discussion) hold.
 *
 * @param string $name The name typed.
 * @return string|WP_Error
 */
function lazer_wave_scores_clean_name( $name ) {
	$name   = trim( (string) preg_replace( '/\s+/u', ' ', wp_strip_all_tags( (string) $name ) ) );
	$length = function_exists( 'mb_strlen' ) ? mb_strlen( $name, 'UTF-8' ) : strlen( $name );
	if ( $length < 1 || $length > LAZER_WAVE_SCORES_NAME_MAX ) {
		/* translators: %d: the most characters a name can have. */
		return new WP_Error( 'lazer_wave_name', sprintf( __( 'A name is 1 to %d characters.', 'lazer-wave-game' ), LAZER_WAVE_SCORES_NAME_MAX ), array( 'status' => 400 ) );
	}
	if ( ! preg_match( "/^[\\p{L}\\p{N} ._'!?-]+$/u", $name ) ) {
		return new WP_Error( 'lazer_wave_name', __( 'A name can have letters, numbers, spaces and . _ \' ! ? - in it.', 'lazer-wave-game' ), array( 'status' => 400 ) );
	}
	if ( wp_check_comment_disallowed_list( $name, '', '', $name, '', '' ) ) {
		return new WP_Error( 'lazer_wave_name', __( 'That name is not allowed here: try another.', 'lazer-wave-game' ), array( 'status' => 400 ) );
	}
	return $name;
}

/**
 * A board's top scores under the scoring version in force, best first (ties by who got there first).
 *
 * @param string $board      The board.
 * @param string $difficulty The difficulty.
 * @param int    $limit      How many.
 * @return array[] place, name, score, reached, combo (null if not recorded: posted before 1.12.0), grade, date
 *                 (RFC 3339, UTC)
 */
function lazer_wave_scores_top( $board, $difficulty, $limit ) {
	global $wpdb;
	$table = lazer_wave_scores_table();
	$rows  = $wpdb->get_results( // phpcs:ignore WordPress.DB.DirectDatabaseQuery -- a table of the plugin's own, read fresh
		$wpdb->prepare(
			"SELECT name, score, reached, combo, grade, created FROM {$table} WHERE board = %s AND difficulty = %s AND version = %d AND hidden = 0 ORDER BY score DESC, id ASC LIMIT %d", // phpcs:ignore WordPress.DB.PreparedSQL.InterpolatedNotPrepared -- the table's own name
			$board,
			$difficulty,
			lazer_wave_scores_version(),
			max( 1, min( 50, (int) $limit ) )
		),
		ARRAY_A
	);
	$out = array();
	foreach ( (array) $rows as $i => $row ) {
		$out[] = array(
			'place'   => $i + 1,
			'name'    => $row['name'],
			'score'   => (int) $row['score'],
			'reached' => (int) $row['reached'],
			'combo'   => null === $row['combo'] ? null : (int) $row['combo'],
			'grade'   => $row['grade'],
			'date'    => mysql_to_rfc3339( $row['created'] ),
		);
	}
	return $out;
}

/**
 * The routes.
 */
function lazer_wave_scores_routes() {
	$board      = array(
		'type'     => 'string',
		'required' => true,
	);
	$difficulty = array(
		'type'     => 'string',
		'required' => true,
		'enum'     => array( 'easy', 'normal', 'hard', 'true' ),
	);
	register_rest_route(
		'lazer-wave/v1',
		'/scores',
		array(
			array(
				'methods'             => WP_REST_Server::READABLE,
				'callback'            => 'lazer_wave_scores_rest_board',
				'permission_callback' => '__return_true',
				'args'                => array(
					'board'      => $board,
					'difficulty' => $difficulty,
					'limit'      => array(
						'type'    => 'integer',
						'default' => LAZER_WAVE_SCORES_TOP,
						'minimum' => 1,
						'maximum' => 50,
					),
				),
			),
			array(
				'methods'             => WP_REST_Server::CREATABLE,
				'callback'            => 'lazer_wave_scores_rest_post',
				'permission_callback' => '__return_true', // anyone may post: the ticket, the limits and the rate are the guard
				'args'                => array(
					'ticket'  => array(
						'type'     => 'string',
						'required' => true,
					),
					'name'    => array(
						'type'     => 'string',
						'required' => true,
					),
					'score'   => array(
						'type'     => 'integer',
						'required' => true,
						'minimum'  => 1,
					),
					'reached' => array(
						'type'    => 'integer',
						'default' => 0,
						'minimum' => 0,
					),
					'combo'   => array(
						'type'    => 'integer',
						'default' => 0,
						'minimum' => 0,
					),
					'grade'   => array(
						'type'    => 'string',
						'default' => '',
					),
				),
			),
		)
	);
	register_rest_route(
		'lazer-wave/v1',
		'/tickets',
		array(
			'methods'             => WP_REST_Server::CREATABLE,
			'callback'            => 'lazer_wave_scores_rest_ticket',
			'permission_callback' => '__return_true',
			'args'                => array(
				'board'      => $board,
				'difficulty' => $difficulty,
				'version'    => array(
					'type'     => 'integer',
					'required' => true,
				),
			),
		)
	);
}
add_action( 'rest_api_init', 'lazer_wave_scores_routes' );

/**
 * GET scores: a board.
 *
 * @param WP_REST_Request $request The request.
 */
function lazer_wave_scores_rest_board( $request ) {
	$board      = (string) $request['board'];
	$difficulty = (string) $request['difficulty'];
	if ( ! lazer_wave_scores_board_ok( $board ) || ! lazer_wave_scores_difficulty_ok( $difficulty ) ) {
		return new WP_Error( 'lazer_wave_board', __( 'There is no such board.', 'lazer-wave-game' ), array( 'status' => 404 ) );
	}
	return rest_ensure_response(
		array(
			'board'      => $board,
			'difficulty' => $difficulty,
			'scores'     => lazer_wave_scores_top( $board, $difficulty, (int) $request['limit'] ),
		)
	);
}

/**
 * POST tickets: a ticket for a play about to start.
 *
 * @param WP_REST_Request $request The request.
 */
function lazer_wave_scores_rest_ticket( $request ) {
	$board      = (string) $request['board'];
	$difficulty = (string) $request['difficulty'];
	if ( (int) $request['version'] !== lazer_wave_scores_version() ) {
		return new WP_Error( 'lazer_wave_version', __( 'This copy of the game is out of date: reload the page to post scores.', 'lazer-wave-game' ), array( 'status' => 409 ) );
	}
	if ( ! lazer_wave_scores_board_ok( $board ) || ! lazer_wave_scores_difficulty_ok( $difficulty ) ) {
		return new WP_Error( 'lazer_wave_board', __( 'There is no such board.', 'lazer-wave-game' ), array( 'status' => 404 ) );
	}
	if ( ! lazer_wave_scores_rate_ok( 'ticket', 300, HOUR_IN_SECONDS ) ) { // the game keeps an unspent ticket through retries; room for a house or a school behind one address
		return new WP_Error( 'lazer_wave_rate', __( 'Too many games started from here: try again later.', 'lazer-wave-game' ), array( 'status' => 429 ) );
	}
	return rest_ensure_response( array( 'ticket' => lazer_wave_scores_make_ticket( $board, $difficulty ) ) );
}

/**
 * POST scores: a score, with the ticket its play started with. Its place on the board comes back.
 *
 * @param WP_REST_Request $request The request.
 */
function lazer_wave_scores_rest_post( $request ) {
	global $wpdb;
	$ticket = lazer_wave_scores_read_ticket( $request['ticket'] );
	if ( ! $ticket || ! lazer_wave_scores_board_ok( $ticket['b'] ) || ! lazer_wave_scores_difficulty_ok( $ticket['d'] ) ) {
		return new WP_Error( 'lazer_wave_ticket', __( 'This game has no ticket from this site: start a new one to post a score.', 'lazer-wave-game' ), array( 'status' => 400 ) );
	}
	$seconds = time() - (int) $ticket['t'];
	if ( $seconds < 0 || $seconds > DAY_IN_SECONDS ) {
		return new WP_Error( 'lazer_wave_ticket', __( 'This game\'s ticket has run out: start a new one to post a score.', 'lazer-wave-game' ), array( 'status' => 400 ) );
	}
	$used = 'lw_ticket_' . $ticket['n'];
	if ( get_transient( $used ) ) {
		return new WP_Error( 'lazer_wave_ticket', __( 'This game\'s score has been posted already.', 'lazer-wave-game' ), array( 'status' => 409 ) );
	}
	if ( ! lazer_wave_scores_rate_ok( 'post', 10, 10 * MINUTE_IN_SECONDS ) ) {
		return new WP_Error( 'lazer_wave_rate', __( 'Too many scores posted from here: try again in a few minutes.', 'lazer-wave-game' ), array( 'status' => 429 ) );
	}
	$name = lazer_wave_scores_clean_name( $request['name'] );
	if ( is_wp_error( $name ) ) {
		return $name;
	}
	$board      = $ticket['b'];
	$difficulty = $ticket['d'];
	$score      = (int) $request['score'];
	$most       = count( lazer_wave_scores_levels( $board ) );
	$reached    = 0 === strpos( $board, 'level-' ) ? 1 : min( $most, max( 0, (int) $request['reached'] ) );
	$grade      = preg_match( '/^(S\+|SS|S|A|B|C|D|F)$/', (string) $request['grade'] ) ? (string) $request['grade'] : '';
	$combo      = min( lazer_wave_scores_combo_cap( $board, $reached ), max( 0, (int) $request['combo'] ) );
	if ( $score > lazer_wave_scores_cap( $board, $difficulty, $reached ) ) {
		return new WP_Error( 'lazer_wave_score', __( 'That is more than those levels could give.', 'lazer-wave-game' ), array( 'status' => 400 ) );
	}
	if ( $seconds < lazer_wave_scores_min_seconds( $board, $reached ) ) {
		return new WP_Error( 'lazer_wave_score', __( 'That came back sooner than the songs could have played.', 'lazer-wave-game' ), array( 'status' => 400 ) );
	}
	set_transient( $used, 1, DAY_IN_SECONDS ); // once only
	$table = lazer_wave_scores_table();
	$wpdb->insert( // phpcs:ignore WordPress.DB.DirectDatabaseQuery.DirectQuery -- a table of the plugin's own
		$table,
		array(
			'board'      => $board,
			'difficulty' => $difficulty,
			'name'       => $name,
			'score'      => $score,
			'reached'    => $reached,
			'combo'      => $combo,
			'grade'      => $grade,
			'seconds'    => $seconds,
			'version'    => lazer_wave_scores_version(),
			'ip_hash'    => lazer_wave_scores_ip_hash(),
			'hidden'     => 0,
			'created'    => current_time( 'mysql', true ),
		),
		array( '%s', '%s', '%s', '%d', '%d', '%d', '%s', '%d', '%d', '%s', '%d', '%s' )
	);
	$above = (int) $wpdb->get_var( // phpcs:ignore WordPress.DB.DirectDatabaseQuery -- a table of the plugin's own, read fresh
		$wpdb->prepare(
			"SELECT COUNT(*) FROM {$table} WHERE board = %s AND difficulty = %s AND version = %d AND hidden = 0 AND score > %d", // phpcs:ignore WordPress.DB.PreparedSQL.InterpolatedNotPrepared -- the table's own name
			$board,
			$difficulty,
			lazer_wave_scores_version(),
			$score
		)
	);
	return rest_ensure_response(
		array(
			'ok'    => true,
			'place' => $above + 1,
			'name'  => $name,
		)
	);
}

/**
 * A board's title: "Full Run · NORMAL", "Boss Rush · HARD", "Level 15: Static Bloom · EASY".
 *
 * @param string $board      The board.
 * @param string $difficulty The difficulty.
 */
function lazer_wave_scores_title( $board, $difficulty ) {
	$limits = lazer_wave_scores_limits();
	$levels = lazer_wave_scores_levels( $board );
	if ( 'run' === $board ) {
		$what = __( 'Full Run', 'lazer-wave-game' );
	} elseif ( 'rush' === $board ) {
		$what = __( 'Boss Rush', 'lazer-wave-game' );
	} else {
		/* translators: 1: a level's number, 2: its name. */
		$what = sprintf( __( 'Level %1$d: %2$s', 'lazer-wave-game' ), $levels[0], $limits['levels'][ $levels[0] ]['name'] );
	}
	return $what . ' · ' . strtoupper( $difficulty );
}

/**
 * What a score's play got to, as a board says it: on a run the level it ended in (or all of them), on a rush the boss,
 * on a level its rank.
 *
 * @param string $board The board.
 * @param array  $row   The score: reached and grade.
 */
function lazer_wave_scores_detail( $board, $row ) {
	$most = count( lazer_wave_scores_levels( $board ) );
	if ( 0 === strpos( $board, 'level-' ) ) {
		return $row['grade'];
	}
	if ( (int) $row['reached'] >= $most ) {
		return __( 'Cleared', 'lazer-wave-game' );
	}
	if ( 'rush' === $board ) {
		/* translators: 1: the boss the rush ended at, 2: how many bosses there are. */
		return sprintf( __( 'Boss %1$d of %2$d', 'lazer-wave-game' ), (int) $row['reached'] + 1, $most );
	}
	/* translators: %d: the level the run ended at. */
	return sprintf( __( 'Level %d', 'lazer-wave-game' ), (int) $row['reached'] + 1 );
}

/**
 * A board, for a page: the [lazer_wave_scores] shortcode and the Lazer Wave Leaderboard block.
 *
 * @param array $args board ("run", "rush" or "level-n"), difficulty, limit, title (a title of your own, or the board's).
 */
function lazer_wave_scores_render( $args = array() ) {
	$args       = wp_parse_args(
		$args,
		array(
			'board'      => 'run',
			'difficulty' => 'normal',
			'limit'      => LAZER_WAVE_SCORES_TOP,
			'title'      => '',
		)
	);
	$board      = (string) $args['board'];
	$difficulty = (string) $args['difficulty'];
	if ( ! lazer_wave_scores_board_ok( $board ) || ! lazer_wave_scores_difficulty_ok( $difficulty ) ) {
		return current_user_can( 'edit_posts' ) ? '<p>' . esc_html__( 'Lazer Wave: there is no such leaderboard.', 'lazer-wave-game' ) . '</p>' : '';
	}
	$rows  = lazer_wave_scores_top( $board, $difficulty, max( 1, min( 50, (int) $args['limit'] ) ) );
	$title = '' !== $args['title'] ? $args['title'] : lazer_wave_scores_title( $board, $difficulty );
	wp_enqueue_style( 'lazer-wave-game' );
	ob_start();
	?>
	<figure class="lazer-wave-scores">
		<figcaption class="lazer-wave-scores__title"><?php echo esc_html( $title ); ?></figcaption>
		<?php if ( ! $rows ) : ?>
			<p class="lazer-wave-scores__empty"><?php esc_html_e( 'No scores yet. Be the first.', 'lazer-wave-game' ); ?></p>
		<?php else : ?>
			<table class="lazer-wave-scores__table">
				<thead>
					<tr>
						<th scope="col">#</th>
						<th scope="col"><?php esc_html_e( 'Name', 'lazer-wave-game' ); ?></th>
						<th scope="col"><?php esc_html_e( 'Score', 'lazer-wave-game' ); ?></th>
						<th scope="col"><?php esc_html_e( 'Max combo', 'lazer-wave-game' ); ?></th>
						<th scope="col"><?php echo 0 === strpos( $board, 'level-' ) ? esc_html__( 'Rank', 'lazer-wave-game' ) : esc_html__( 'Reached', 'lazer-wave-game' ); ?></th>
					</tr>
				</thead>
				<tbody>
					<?php foreach ( $rows as $row ) : ?>
						<tr>
							<td><?php echo esc_html( $row['place'] ); ?></td>
							<td><?php echo esc_html( $row['name'] ); ?></td>
							<td><?php echo esc_html( number_format_i18n( $row['score'] ) ); ?></td>
							<td><?php echo null === $row['combo'] ? '&ndash;' : esc_html( number_format_i18n( $row['combo'] ) ); ?></td>
							<td><?php echo esc_html( lazer_wave_scores_detail( $board, $row ) ); ?></td>
						</tr>
					<?php endforeach; ?>
				</tbody>
			</table>
		<?php endif; ?>
	</figure>
	<?php
	return ob_get_clean();
}

/**
 * The shortcode, and the block.
 */
function lazer_wave_scores_register() {
	// [lazer_wave_scores board="run" difficulty="normal" limit="10"], board "run", "rush" or "level-15"
	add_shortcode(
		'lazer_wave_scores',
		function ( $atts ) {
			return lazer_wave_scores_render(
				shortcode_atts(
					array(
						'board'      => 'run',
						'difficulty' => 'normal',
						'limit'      => LAZER_WAVE_SCORES_TOP,
						'title'      => '',
					),
					$atts,
					'lazer_wave_scores'
				)
			);
		}
	);
	register_block_type( __DIR__ . '/block-scores' );
}
add_action( 'init', 'lazer_wave_scores_register' );

/**
 * Settings > Privacy's suggested text: what a posted score keeps.
 */
function lazer_wave_scores_privacy() {
	if ( function_exists( 'wp_add_privacy_policy_content' ) ) {
		wp_add_privacy_policy_content(
			__( 'Lazer Wave Game', 'lazer-wave-game' ),
			wp_kses_post( wpautop( __( 'When you post a score from the Lazer Wave game, this site keeps the name you type, the score, how far the game got and how long it took, when it was posted, and a salted hash of your IP address, used to limit how often scores can be posted and never shown. The name and the score are shown on the game\'s leaderboards. Records and settings the game keeps for itself stay in your browser.', 'lazer-wave-game' ) ) )
		);
	}
}
add_action( 'admin_init', 'lazer_wave_scores_privacy' );

/**
 * Tools > Lazer Wave Scores: every board's entries, newest first, to hide, show again or delete.
 */
function lazer_wave_scores_admin_menu() {
	add_management_page(
		__( 'Lazer Wave Scores', 'lazer-wave-game' ),
		__( 'Lazer Wave Scores', 'lazer-wave-game' ),
		'manage_options',
		'lazer-wave-scores',
		'lazer_wave_scores_admin_page'
	);
}
add_action( 'admin_menu', 'lazer_wave_scores_admin_menu' );

/**
 * The admin screen: a hide, show or delete pressed is done first, then the list as it stands.
 */
function lazer_wave_scores_admin_page() {
	global $wpdb;
	if ( ! current_user_can( 'manage_options' ) ) {
		return;
	}
	$table = lazer_wave_scores_table();
	if ( isset( $_POST['lazer_wave_action'], $_POST['id'] ) ) {
		check_admin_referer( 'lazer_wave_scores' );
		$id     = absint( $_POST['id'] );
		$action = sanitize_key( wp_unslash( $_POST['lazer_wave_action'] ) );
		if ( 'delete' === $action ) {
			$wpdb->delete( $table, array( 'id' => $id ), array( '%d' ) ); // phpcs:ignore WordPress.DB.DirectDatabaseQuery -- a table of the plugin's own
		} elseif ( 'hide' === $action || 'show' === $action ) {
			$wpdb->update( $table, array( 'hidden' => 'hide' === $action ? 1 : 0 ), array( 'id' => $id ), array( '%d' ), array( '%d' ) ); // phpcs:ignore WordPress.DB.DirectDatabaseQuery -- a table of the plugin's own
		}
	}
	$board      = isset( $_GET['board'] ) ? sanitize_text_field( wp_unslash( $_GET['board'] ) ) : ''; // phpcs:ignore WordPress.Security.NonceVerification.Recommended -- a filter for a list
	$difficulty = isset( $_GET['difficulty'] ) ? sanitize_text_field( wp_unslash( $_GET['difficulty'] ) ) : ''; // phpcs:ignore WordPress.Security.NonceVerification.Recommended -- a filter for a list
	$where      = 'WHERE 1=1';
	$values     = array();
	if ( lazer_wave_scores_board_ok( $board ) ) {
		$where   .= ' AND board = %s';
		$values[] = $board;
	}
	if ( lazer_wave_scores_difficulty_ok( $difficulty ) ) {
		$where   .= ' AND difficulty = %s';
		$values[] = $difficulty;
	}
	$sql  = "SELECT * FROM {$table} {$where} ORDER BY id DESC LIMIT 200";
	$rows = $wpdb->get_results( $values ? $wpdb->prepare( $sql, $values ) : $sql, ARRAY_A ); // phpcs:ignore WordPress.DB -- a table of the plugin's own, its own filters
	?>
	<div class="wrap">
		<h1><?php esc_html_e( 'Lazer Wave Scores', 'lazer-wave-game' ); ?></h1>
		<p><?php esc_html_e( 'The newest 200 scores posted from the game. A hidden score stays here but leaves the boards; a deleted one is gone. Names are held to the Disallowed Comment Keys in Settings > Discussion.', 'lazer-wave-game' ); ?></p>
		<form method="get">
			<input type="hidden" name="page" value="lazer-wave-scores" />
			<label><?php esc_html_e( 'Board', 'lazer-wave-game' ); ?>
				<input type="text" name="board" value="<?php echo esc_attr( $board ); ?>" placeholder="run, rush, level-15" />
			</label>
			<label><?php esc_html_e( 'Difficulty', 'lazer-wave-game' ); ?>
				<select name="difficulty">
					<option value=""><?php esc_html_e( 'All', 'lazer-wave-game' ); ?></option>
					<?php foreach ( array( 'easy', 'normal', 'hard', 'true' ) as $d ) : ?>
						<option value="<?php echo esc_attr( $d ); ?>" <?php selected( $difficulty, $d ); ?>><?php echo esc_html( strtoupper( $d ) ); ?></option>
					<?php endforeach; ?>
				</select>
			</label>
			<?php submit_button( __( 'Filter', 'lazer-wave-game' ), 'secondary', '', false ); ?>
		</form>
		<table class="widefat striped" style="margin-top: 12px;">
			<thead>
				<tr>
					<th><?php esc_html_e( 'Board', 'lazer-wave-game' ); ?></th>
					<th><?php esc_html_e( 'Difficulty', 'lazer-wave-game' ); ?></th>
					<th><?php esc_html_e( 'Name', 'lazer-wave-game' ); ?></th>
					<th><?php esc_html_e( 'Score', 'lazer-wave-game' ); ?></th>
					<th><?php esc_html_e( 'Max combo', 'lazer-wave-game' ); ?></th>
					<th><?php esc_html_e( 'Reached', 'lazer-wave-game' ); ?></th>
					<th><?php esc_html_e( 'Took', 'lazer-wave-game' ); ?></th>
					<th><?php esc_html_e( 'Posted (UTC)', 'lazer-wave-game' ); ?></th>
					<th><?php esc_html_e( 'From', 'lazer-wave-game' ); ?></th>
					<th></th>
				</tr>
			</thead>
			<tbody>
				<?php if ( ! $rows ) : ?>
					<tr><td colspan="10"><?php esc_html_e( 'No scores.', 'lazer-wave-game' ); ?></td></tr>
				<?php endif; ?>
				<?php foreach ( (array) $rows as $row ) : ?>
					<tr<?php echo $row['hidden'] ? ' style="opacity: 0.5;"' : ''; ?>>
						<td><?php echo esc_html( $row['board'] ); ?><?php echo (int) $row['version'] !== lazer_wave_scores_version() ? ' <em>(' . esc_html__( 'old scoring', 'lazer-wave-game' ) . ')</em>' : ''; ?></td>
						<td><?php echo esc_html( strtoupper( $row['difficulty'] ) ); ?></td>
						<td><?php echo esc_html( $row['name'] ); ?></td>
						<td><?php echo esc_html( number_format_i18n( (int) $row['score'] ) ); ?></td>
						<td><?php echo null === $row['combo'] ? '&ndash;' : esc_html( number_format_i18n( (int) $row['combo'] ) ); ?></td>
						<td><?php echo esc_html( lazer_wave_scores_detail( $row['board'], $row ) ); ?></td>
						<td><?php echo esc_html( gmdate( 'G:i:s', (int) $row['seconds'] ) ); ?></td>
						<td><?php echo esc_html( $row['created'] ); ?></td>
						<td><code><?php echo esc_html( substr( $row['ip_hash'], 0, 8 ) ); ?></code></td>
						<td>
							<form method="post" style="display: inline;">
								<?php wp_nonce_field( 'lazer_wave_scores' ); ?>
								<input type="hidden" name="id" value="<?php echo esc_attr( $row['id'] ); ?>" />
								<button class="button button-small" name="lazer_wave_action" value="<?php echo $row['hidden'] ? 'show' : 'hide'; ?>"><?php echo $row['hidden'] ? esc_html__( 'Show', 'lazer-wave-game' ) : esc_html__( 'Hide', 'lazer-wave-game' ); ?></button>
								<button class="button button-small button-link-delete" name="lazer_wave_action" value="delete" onclick="return confirm('<?php echo esc_js( __( 'Delete this score for good?', 'lazer-wave-game' ) ); ?>');"><?php esc_html_e( 'Delete', 'lazer-wave-game' ); ?></button>
							</form>
						</td>
					</tr>
				<?php endforeach; ?>
			</tbody>
		</table>
	</div>
	<?php
}
