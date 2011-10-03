<?php

require_once('JSLikeHTMLElement.php');
require_once('Readability.php');

if (!isset($_GET['url']) || $_GET['url'] == '') {
	die('Feed me URLs.');
}

$url = $_GET['url'];
if (!preg_match('!^https?://!i', $url)) $url = 'http://'.$url;

if(!isset($_GET['clean'])) {
	echo file_get_contents($url);
} else {
	$html = file_get_contents($url);
	if ($html != false) {
		$r = new Readability($html, $url);
		$r->init();
		echo $r->articleContent->innerHTML;		
	}
}
	
?>