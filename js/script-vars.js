// Author: Harris Novick

var orange_articles, 
		orange_callbacks, 
		orange_els, 
		orange_extraction, 
		orange_hnsearch, 
		orange_init, 
		orange_listeners, 
		orange_queries, 
		orange_reader, 
		orange_search, 
		orange_spinner, 
		orange_storage, 
		orange_urls, 
		orange_utils;
		
orange_init = function() {
  orange_storage.get("orange_queries");
  orange_hnsearch.fetch_json(orange_urls.front_hn(0), "front", 0);
  orange_listeners.init();
}

orange_articles = [];

orange_callbacks = {
  storage_get: function() {
    var query_list = [];
    $.each(orange_queries, function(query, display_query) {
      if (query === "hn") {
        query_list.push("<li><a href='#' class='close'>x</a><a href='#' data-search='hn'>news.ycombinator.com</a></li>");
      } else {
        query_list.push("<li><a href='#' class='close'>x</a><a href='#' data-search=" + query + ">" + display_query + "</a></li>");
      }
    });

    orange_els.search_list.append(query_list.join("")).hide().fadeIn(350);

    query_list = null;
  },

  storage_set: function(query, display_query) {
    var query_list_item;
    if (query === "hn") {
      query_list_item = "<li><a href='#' class='close'>x</a><a href='#' data-search='hn'>news.ycombinator.com</a></li>";
    } else {
      query_list_item = "<li><a href='#' class='close'>x</a><a href='#' data-search=" + query + ">" + display_query + "</a></li>";
    }

    orange_els.search_list.append(query_list_item).children(":last").hide().fadeIn(100);

    query_list_item = null;
  },

  storage_remove: function(query) {
    orange_els.search_list.find("li a[data-search='" + query + "']").parents("li").fadeOut(180, function() {
      $(this).remove();
    });     
  },

  storage_destroy: function() {
    orange_els.search_list.fadeOut(180, function() {
      $(this).remove();
    });     
  }
}

orange_els = {
  window: $(window),
	html: $("html"),
  search: $("#search"),
	search_list: $("nav ul.searches"),
  container: $("body > div.container-fluid"),
  grid: $("#article_grid"),
  reader: $("#reader"),
	hud: $("#reader_hud"),
	hud_container: $("#hud_container")
}

orange_extraction = {
  init: function() {
    var $visible_articles = orange_els.grid.children("div").children("article.pre-render:in-viewport"),
                        i = $visible_articles.length,
                    $this,
                  article;
    
    if (i) {
      $visible_articles.addClass("content");
      while (i--) {
        $this = $visible_articles.eq(-i);
        article = orange_articles[$this.data("article")];
        
        if (article.domain !== "news.ycombinator.com") {
					orange_extraction.request($this, article.url, article.domain);
        } else {
          orange_extraction.complete($this);
        }         
      }   
    } else {
      $visible_articles = null;
      $this = null;
      article = null;
    }
  },

  request: function(el, url, domain) {
    el.removeClass("pre-render");
    $.ajax({
      url: "orange.php?clean=true&url=" + url + "&domain=" + domain,
      cache: true,
      success: function(data) {
        orange_extraction.success(el, data);
        data = null;
      },
      complete: function() {
        orange_extraction.complete(el);
      },
      timeout: 25000
    });
  },

  success: function(el, data) {
    el.removeClass("pre-render");

    var article = orange_articles[el.data("article")],
        $images,
        $best_image;

    if (article) { 
      $images = $(data).find("img");

      if ($images.length) {
        $best_image = $images.filter(function(i, img) { 
                        return $(img).hasClass("orange-best-image"); 
                      }).first();

        if (!($best_image.length)) {
          $best_image = $images.sort(orange_utils.sort.by_image_size).first();
        }

        $best_image.clone().prependTo(el).wrap("<div class='thumbnail' />").scaleImage();     
      }

      article.content = data;
      
      $best_image = null;
      $images = null;
      article = null;
      data = null;  
    }
  },

  complete: function(el) {
    el.removeClass("pre-render").find("img.loader").remove();
  }
}

orange_hnsearch = {
  fetch_json: function(url, query, start) {
    orange_spinner.show("spinner_one");
    $.ajax({
      url: url,
      dataType: "jsonp",
      success: function(data) {
        orange_hnsearch.parse_json(data.results, url, query, start);
      },
      complete: function() {
        orange_spinner.hide();
      },
      timeout: 15000
    });
  },

  parse_json: function(results, url, query, start) {
    var result = {},
        article = {},
        articles = [],
        infinite_scroller = "<span class='infinite-scroll pre-render'><span id='spinner_two'></span><a href='#'>More Submissions</a></span>",
        domain,
        i = results.length;

    orange_search.current = {
      url: url.replace("&start=" + start, "&start=" + (start + i)),
      query: query,
      start: start + i
    };  
    
    delete orange_articles;
    orange_articles = [];

    while (i--) {
      result = results[i].item;

      article = {
        sigid: result._id || "",
        title: result.title || "",
        hn_text: result.text || "",
        domain: result.domain || "news.ycombinator.com",
        url: result.url || "http://news.ycombinator.com/item?id=" + result.id || "",
        points: result.points || "0",
        num_comments: result.num_comments || "0",
        user: result.username || "",
        published_date: Date.fromString(result.create_ts).toRelativeTime() || "",
        hn_url: "http://news.ycombinator.com/item?id=" + result.id || ""
      };

      article.hn_user_url = "http://news.ycombinator.com/user?id=" + article.user || "";

      if (query === "ask") {
        article.title = article.title.replace(/^Ask HN\: |Ask HN\:|Ask HN - |Ask HN -/i, "");
      } else if (query === "show") {
        article.title = article.title.replace(/^Show HN\: |Show HN\:|Show HN - |Show HN -/i, "");
      }
      orange_articles.push(article);

      result = null;
      article = null;
    }

    i = orange_articles.length;

    while (i--) {
      article = orange_articles[i];
      domain = article.domain;

      articles.push('<article class="item pre-render" title="' + domain + '" data-article="' + i + '"><a class="date" href="' + article.hn_url + '" target="_blank">' + article.published_date + '</a><img class="favicon" src="http://' + domain[0] + '.getfavicon.appspot.com/http://' + domain + '?defaulticon=lightpng" alt="' + domain + '" width="16" data-domain="' + domain + '" /><img class="loader" src="http://harrisnovick.com/orange/img/ajax-loader.gif" alt="Loading..." width="16" height="16" /><h3 class="title"><a href="' + article.url + '" target="_blank">' + article.title + '</a></h3><a class="meta user" href="' + article.hn_user_url + '" target="_blank">' + article.user + '</a><div class="meta stats"><a class="points" href="#">' + article.points + '</a><a class="comment-count" href="#">' + article.num_comments + '</a></div></article>');

      domain = null;
    }

    orange_spinner.hide();

    orange_els.grid.detach().html("<div id='article_wrapper'>" + articles.join("") + "</div>" + infinite_scroller).appendTo(orange_els.container);
    orange_hnsearch.render_json();

    article = null;
    articles = null;
    results = null;
    infinite_scroller = null;   
  },

  render_json: function() {
    orange_els.search.hide().find("input.query").val("");
    orange_els.window.scrollTop(0).trigger("scroll");
    (function n(e) {
      e.eq(0).addClass("rendered");
      var fade_timer = setTimeout(function() {
        n(e.slice(1));
      }, 30);
      if (!(e.length)) {
        clearTimeout(fade_timer);
        fade_timer = null;
      }
    })(orange_els.grid.find(".pre-render"));
  },

  fetch_comments: function(sigid, show) {
    $.ajax({
      url: orange_urls.comments_hn(sigid, 0),
      dataType: "jsonp",
      cache: true,
      success: function(data) {
        orange_reader.render_comments(data);
        data = null;
      },
      complete: function() {
        if (show) {
          orange_els.hud.find("a.comments").click();
        }
      },
      timeout: 10000
    });
  }
}

orange_listeners = {
  init: function() {
    orange_listeners.window();
    orange_listeners.article();
    orange_listeners.nav();
    orange_listeners.search();
    orange_listeners.close();
    orange_listeners.username();
    orange_listeners.domain();
    orange_listeners.infinite_scroller();
		orange_listeners.hud_container();
		orange_listeners.toggle_comments();
  },

  article: function() {
    var $this,
        $target;
        
    orange_els.grid.delegate("article.item", "click", function(e) {
      $target = $(e.target);
      if ($target.hasClass("title") || $target.hasClass("comment-count")) {
        $this = $(this);
        orange_reader.show($this, $target);
        e.preventDefault();
      } else {
        $this = null;
        $target = null;
      }
    });
  },

  close: function() {
    $("nav").delegate("a.close", "click", function(e) {
      var query = $(this).siblings("a").data("search");
      if (!($("nav .searches li").length)) {
        orange_storage.destroy("orange_queries");
      } else {
        orange_storage.remove("orange_queries", query);
      }
      e.preventDefault();
    });
  },

  domain: function() {
    orange_els.grid.delegate(".item .favicon", "click", function(e) {
      var display_query = $(this).data("domain"),
          query = encodeURI(display_query);
      if (display_query === "news.ycombinator.com") {
        orange_hnsearch.fetch_json(orange_urls.search_hn("hn", 0), "", 0);
      } else {
        orange_hnsearch.fetch_json(orange_urls.domain_hn(query, 0), "", 0);
      }
      orange_storage.set("orange_queries", query, display_query);
      e.preventDefault();
    });
  },

	hud_container: function() {
		orange_els.hud_container.hover(function() {
			clearTimeout(window.hud_hover_timer);
			$(this).addClass('hover');
		}, function() {
			var $this = $(this);
			window.hud_hover_timer = setTimeout(function() {
				$this.removeClass('hover');
			}, 950);
		});
	},

  infinite_scroller: function() {
    orange_els.grid.delegate(".infinite-scroll", "click", function(e) {
      var current = orange_search.current,
          opts = { color: '#FFF' };
      $(this).find("a").text("");
      orange_spinner.show("spinner_two", opts);
      orange_hnsearch.fetch_json(current.url, current.query, current.start);
      e.preventDefault();
    });
  },

  nav: function() {
    $("nav a:not('.search, .close')").live("click", function(e) {
      var term = $(this).data("search"),
          search = "";
      if (term === "front") {
        search = orange_urls.front_hn(0);
      } else if (term === "ask") {
        search = orange_urls.ask_hn(0);
      } else if (term === "show") {
        search = orange_urls.show_hn(0);
      } else {
        search = orange_urls.search_hn(term, 0);
      }
      orange_hnsearch.fetch_json(search, term, 0);
      e.preventDefault();
    });
  },

  search: function() {
    var $input = orange_els.search.find("input.query"),
        $button = orange_els.search.find("input.btn");

    $("nav a.search").click(function(e) {
      if (!(orange_els.search.filter(":visible").length)) {
        orange_search.show($input, $button);
      }
      e.preventDefault();
    });
  },

	toggle_comments: function() {
		orange_els.hud.delegate("a.comments.hidden", "click", function(e) {
			$("#article_container").scrollTop(0);
			$("#page_content").hide();
			$("#article_comments").show();
			$(this).attr("class", "comments visible");
			e.preventDefault();
		});
		
		orange_els.hud.delegate("a.comments.visible", "click", function(e) {
			$("#article_container").scrollTop(0);
			$("#article_comments").hide();
			$("#page_content").show();
			$(this).attr("class", "comments hidden");
			e.preventDefault();
		});
	},

  username: function() {
    orange_els.grid.delegate(".item .user a", "click", function(e) {
      var display_query = $(this).text(),
          query = encodeURI(display_query);
      orange_hnsearch.fetch_json(orange_urls.user_hn(query, 0), "", 0);
      orange_storage.set("orange_queries", query, display_query);
      e.preventDefault();
    });
  },

  window: function() {
    orange_els.window.bind('scrollstop', function(){
      orange_extraction.init();
    });
  }
}

orange_queries = {};

orange_reader = { 
  show: function($this, $target) {
    var $container = $("#article_container"),
        $article = $container.children("article"),
        article,
        $content;

    $article.remove(); 

    orange_els.html.attr("class", "frozen activating");   
    
    article = orange_articles[$this.data("article")];
    $content = article.content;

    if (!$content) {
      $content = article.hn_text;
    }

    $article.find("#article_title").html('<a href="' + article.url + '" title="' + article.domain + '">' + article.title + '</a>')
      .end().find("#page_content").html($content)
      .end().appendTo($container);

		orange_els.hud.find("a.source").attr("href", article.url).attr("title", article.domain);

		window.hud_timer = setTimeout(function() {
			orange_els.html.attr("class", "frozen activating activated");
		}, 1500);
    
    if (article.num_comments > 0) {
      if ($target.hasClass("comment-count")) {
        orange_hnsearch.fetch_comments(article.sigid, true);
      } else {
        orange_hnsearch.fetch_comments(article.sigid);
      }
    }

    try {
      orange_els.reader.find('code, pre').each(function(i, e) {
        hljs.highlightBlock(e, '  ');
      });       
    } catch(e) {} // One of those rare occasions: http://goo.gl/oQY5Y      
    
    orange_reader.hide($article, $container);  
    
    $content = null;
    $article = null;
    $this = null;
    $target = null;   
  },
  
  hide: function($article, $container) { 
    orange_els.reader.click(function(e) {
      if (e.target !== $article[0] && !($(e.target).closest("article, #hud_container").length)) {
				clearTimeout(window.hud_timer);
        orange_els.html.attr("class", "frozen deactivating");
        setTimeout(function() {
          orange_els.html.attr("class", "preloading");
          $container.attr("style", "").scrollTop(0);
          $("#page_content, #article_comments").html("");
					$("#article_comments").hide();
					$("#page_content").show();
					orange_els.hud.find("a.comments").attr("class", "comments hidden");
        }, 500);      
      }
    });
  },
  
  render_comments: function(data) {
    var results = data.results,
        i = results.length,
        comments = ["<ul class='comments'>"],
        result;

    if (i > 0) {
      while (i--) {
        result = results[i].item;
        comments.push("<li class='comment' data-id='" + result.id + "' data-parent-id='" + result.parent_id + "'><header><a class='user' href='http://news.ycombinator.com/user?id=" + result.username + "'>" + result.username + "</a></header><p>" + result.text + "</p></li>");
        result = null;
      }

      comments.push("</ul>");

      $("#article_comments").html(comments.join(""))
      
      results = null; 
      data = null;
    } else {
      data = null;
      results = null;
      comments = null;
      return;
    }
  }
}

orange_search = {
  current: {
    url: "",
    query: "",
    start: 0      
  },
  
  show: function($input, $button) {
    orange_els.search.show(0, function(){
      $input.focus();

      orange_els.window.keypress(function(e) {
        if(e.keyCode === 13) {
          $button.click();
        }
      });

      $button.one("click", function() {
        var display_query = $input.val(),
            query = encodeURI(display_query);

        if (display_query === "") {
          orange_els.search.hide();
        } else {
          orange_hnsearch.fetch_json(orange_urls.search_hn(query, 0), query, 0);
          orange_storage.set("orange_queries", query, display_query);
        }
      });

      orange_search.hide($button);
    });     
  },
  
  hide: function($button) {
    $("body").bind("click", function(event) {
      if (!($(event.target).closest("#search.popover, nav a.search").length)) {
        orange_els.search.hide();
        $button.unbind("click");
      }
    });     
  }
}

orange_spinner = {
  opts: function(opts) {
    opts = opts || {};
    return {
      lines: opts.lines || 16, // The number of lines to draw
      length: opts.length || 0, // The length of each line
      width: opts.width || 7, // The line thickness
      radius: opts.radius || 3, // The radius of the inner circle
      color: opts.color || "#F60", // #rgb or #rrggbb
      speed: opts.speed || 1.3, // Rounds per second
      trail: opts.trail || 50, // Afterglow percentage
      shadow: opts.shadow || false // Whether to render a shadow
    };
  },
  show: function(id, opts) {
    window.spinner = new Spinner(orange_spinner.opts(opts)).spin(document.getElementById(id));
  },
  hide: function() {
    window.spinner.stop();
  }
}

orange_storage = {
  get: function(item) {
    if (item === "orange_queries") {
      orange_queries = JSON.parse(localStorage.getItem(item)) || {};
      orange_callbacks.storage_get();
      return orange_queries;        
    }
  },

  set: function(item, key, value) {
    if (item === "orange_queries") {
      if (!orange_queries[key]) {
        orange_queries[key] = value;
        orange_callbacks.storage_set(key, value);
        localStorage.setItem(item, JSON.stringify(orange_queries));
      }       
    }
  },

  remove: function(item, key) {
    if (item === "orange_queries") {
      delete orange_queries[key];
      localStorage.setItem(item, JSON.stringify(orange_queries));
      orange_callbacks.storage_remove(key);       
    }
  },

  destroy: function(item) {
    if (item === "orange_queries") {
      orange_queries = {};
      localStorage.removeItem[item];
      orange_callbacks.storage_destroy();        
    }
  }
}

orange_urls = {
  front_hn: function(start) {
    return "http://api.thriftdb.com/api.hnsearch.com/items/_search?weights[title]=1.1&weights[text]=0.7&weights[domain]=2.0&weights[username]=0.1&weights[type]=0.0&boosts[fields][points]=0.15&boosts[fields][num_comments]=0.15&boosts[functions][pow(2,div(div(ms(NOW,create_ts),3600000),72))]=200.0&sortby=product(points,pow(2,div(div(ms(create_ts,NOW),128000),72)))%20desc&filter[fields][type]=submission&limit=39&pretty_print=true&start=" + start;
  },
  user_hn: function(user, start) {
    return "http://api.thriftdb.com/api.hnsearch.com/items/_search?filter[fields][username]=" + user + "&sortby=create_ts%20desc&filter[fields][type]=submission&limit=39&start=" + start;
  },
  domain_hn: function(domain, start) {
    return "http://api.thriftdb.com/api.hnsearch.com/items/_search?filter[fields][domain]=" + domain + "&sortby=create_ts%20desc&filter[fields][type]=submission&limit=39&start=" + start;
  },
  ask_hn: function(start) {
    return "http://api.thriftdb.com/api.hnsearch.com/items/_search?q=ask%20hn&filter[fields][type]=submission&sortby=create_ts%20desc&limit=39&start=" + start;
  },
  show_hn: function(start) {
    return "http://api.thriftdb.com/api.hnsearch.com/items/_search?q=show%20hn&filter[fields][type]=submission&sortby=create_ts%20desc&limit=39&start=" + start;
  },
  search_hn: function(term, start) {
    return "http://api.thriftdb.com/api.hnsearch.com/items/_search?q=" + term + "&filter[fields][type]=submission&sortby=create_ts%20desc&limit=39&start=" + start;
  },
  comments_hn: function(sigid, start) {
    return "http://api.thriftdb.com/api.hnsearch.com/items/_search?filter[fields][type]=comment&filter[fields][discussion.sigid]=" + sigid + "&sortby=create_ts%20desc&limit=100&start=" + start;
  }
} 

orange_utils = {
  sort: {
    by_image_size: function(a, b) {
      return (b.width+b.height) - (a.width+a.height);
    }
  }
}

$(orange_init());