<?php

require_once 'JSLikeHTMLElement.php';
require_once 'Readability.php';
require_once 'SimpleCache.php';

if (!isset($_GET['url']) || $_GET['url'] == '' || !isset($_GET['domain']) || $_GET['domain'] == '') {
	die('Feed me URL + Domain.');
}

$url = $_GET['url'];
$domain = $_GET['domain'];
$cache_url = substr(preg_replace('/[^\p{L}]/u', '', $url), -20);
if (!preg_match('!^https?://!i', $url)) $url = 'http://'.$url;

$cache = new SimpleCache();
	
if ($cache->exists($domain, $cache_url)) {
  $article = $cache->get($domain, $cache_url);
	echo $article;
} else {
	if(!isset($_GET['clean'])) {
		echo file_get_contents($url);
	} else {
		$html = file_get_contents($url);
		if ($html != false) {
			$r = new Readability($html, $url);
			$r->init();
			$article = $r->articleContent->innerHTML;
			$cache->put($domain, $cache_url, $article);
			echo $article;		
		}
	}
}

?>