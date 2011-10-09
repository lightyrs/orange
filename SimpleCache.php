<?php

class SimpleCache
{
	private $expiryInterval = 604800;
	
	public function put($domain, $key, $content)
	{		
		$myCacheDir = 'cache/' . $domain[0] . '/' . $domain;

		if (! file_exists($myCacheDir))
			mkdir($myCacheDir);

		$filename_cache = $myCacheDir . '/' . $key . '.cache'; //Cache filename

		file_put_contents ($filename_cache ,  $content); // save the content
	}
	
	public function get($domain, $key)
	{
		$myCacheDir = 'cache/' . $domain[0] . '/' . $domain;
		
		$filename_cache = $myCacheDir . '/' . $key . '.cache'; //Cache filename

		if (file_exists($filename_cache))
		{
			$cache_time = strtotime(filemtime($filename_cache)) - (int)$expiryInterval;

			if ((int)$cache_time >= 0) //Compare last updated and current time
			{
				return file_get_contents ($filename_cache);   //Get contents from file
			}
		}

		return null;
	}
	
	public function exists($domain, $key)
	{		
		$myCacheDir = 'cache/' . $domain[0] . '/' . $domain;
		
		$filename_cache = $myCacheDir . '/' . $key . '.cache'; //Cache filename

		if (file_exists($filename_cache))
		{
			$cache_time = strtotime(filemtime($filename_cache)) - (int)$expiryInterval;

			if ((int)$cache_time >= 0) //Compare last updated and current time
			{
				return true;
			}
		}

		return false;
	}	
	
}

?>