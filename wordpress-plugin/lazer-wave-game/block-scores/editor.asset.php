<?php
// The editor script is plain JS with no build step; these are the WordPress packages it reads from window.wp.
return array(
	'dependencies' => array( 'wp-blocks', 'wp-block-editor', 'wp-components', 'wp-element', 'wp-i18n', 'wp-server-side-render' ),
	'version'      => '1.15.1',
);
