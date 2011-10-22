<?php
header('Cache-Control: public');
header('Expires: Thu, 7 Feb 2013 20:00:00 GMT');

require_once 'SimpleCache.php';
require_once 'JSLikeHTMLElement.php';
require_once 'Readability.php';

if (!isset($_GET['url']) || !isset($_GET['domain']) || substr($_GET['url'], 0, 4) != 'http') {
  die('<p>Sorry, Orange was unable to parse this page for content.</p>');
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
      $r = new Readability($html, $url, $domain);
      $r->init();
			$article = $r->articleContent->innerHTML;
      echo $article;
      $cache->put($domain, $cache_url, $article);
    }
  }
}

?>