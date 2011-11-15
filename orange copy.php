<?php
header('Content-type: text/plain; charset=utf-8');
header('Expires: ' . strtotime('now + 365 days'));

require_once 'SimpleCache.php';
require_once 'JSLikeHTMLElement.php';
require_once 'Readability.php';

if (!isset($_GET['url']) || !isset($_GET['domain']) || substr($_GET['url'], 0, 4) != 'http') {
  die('<p>Sorry, Orange was unable to parse this page for content.</p>');
}

$cache = new SimpleCache();

$url = strtolower($_GET['url']);
$domain = strtolower($_GET['domain']);
$cache_url = substr(preg_replace('/[^\p{L}]/u', '', $url), -20);

if (!preg_match('!^https?://!i', $url)) $url = 'http://'.$url;

if ($cache->exists($domain, $cache_url)) {
  $article = $cache->get($domain, $cache_url);
  print $article;
} else {
  if(!isset($_GET['clean'])) {
    print file_get_contents($url);
  } else {
    $html = file_get_contents($url);
    if ($html != false) {
      $r = new Readability($html, $url, $domain);
      $r->init();
			$article = $r->articleContent->innerHTML;
      print $article;
      $cache->put($domain, $cache_url, $article);
    }
  }
}
?>