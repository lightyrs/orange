// Author: Harris Novick

(function() {
	var Orange = {

	  init: function() {
	    Orange.storage.get("orange_queries");
	    Orange.hnsearch.fetch_json(Orange.urls.front_hn(0), "front", 0);
	    Orange.listeners.init();
	  },

	  article: function(result) {
	    this.sigid = result._id || "";
	    this.title = result.title || "";
	    this.hn_text = result.text || "";
	    this.domain = result.domain || "news.ycombinator.com";
	    this.url = result.url || "http://news.ycombinator.com/item?id=" + result.id || "";
	    this.points = result.points || "0";
	    this.num_comments = result.num_comments || "0";
	    this.user = result.username || "";
	    this.published_date = Date.fromString(result.create_ts).toRelativeTime() || "";
	    this.hn_url = "http://news.ycombinator.com/item?id=" + result.id || "";
	    this.hn_user_url = "http://news.ycombinator.com/user?id=" + this.user || "";
			this.empty = false;
			this.content = "";
	    this.special = function() {
	      return Orange.constants.SPECIAL_DOMAINS.indexOf(this.domain) !== -1
	    };
	  },

	  articles: [],

	  callbacks: {
	    reader_hide: function() {
				var els = Orange.els;
	      els.html.attr("class", "preloading");
	      els.article_container.attr("style", "").scrollTop(0);
				els.article.html("");
				els.hud.find("a.comments").attr("class", "comments hidden");
	      clearTimeout(Orange.reader_timer);
	    },

	    storage_get: function() {
	      var query_list = [];
	      $.each(Orange.queries, function(query, display_query) {
	        if (query === "hn") {
	          query_list.push("<li><a href='#' class='close'>x</a><a href='#' data-search='hn'>news.ycombinator.com</a></li>");
	        } else {
	          query_list.push("<li><a href='#' class='close'>x</a><a href='#' data-search=" + query + ">" + display_query + "</a></li>");
	        }
	      });

	      Orange.els.search_list.append(query_list.join("")).hide().fadeIn(350);
	    },

	    storage_set: function(query, display_query) {
	      var query_list_item;
	      if (query === "hn") {
	        query_list_item = "<li><a href='#' class='close'>x</a><a href='#' data-search='hn'>news.ycombinator.com</a></li>";
	      } else {
	        query_list_item = "<li><a href='#' class='close'>x</a><a href='#' data-search=" + query + ">" + display_query + "</a></li>";
	      }

	      Orange.els.search_list.append(query_list_item).children(":last").hide().fadeIn(100);
	    },

	    storage_remove: function(query) {
	      Orange.els.search_list.find("li a[data-search='" + query + "']").parents("li").fadeOut(180, function() {
	        $(this).remove();
	      });     
	    },

	    storage_destroy: function() {
	      Orange.els.search_list.fadeOut(180, function() {
	        $(this).remove();
	      });     
	    }
	  },

	  constants: {
	    MAX_ARTICLES: 39,
	    SPECIAL_DOMAINS: ["news.ycombinator.com", "youtube.com", "vimeo.com"]
	  },

	  els: {
	    window: $(window),
	    html: $("html"),
	    search: $("#search"),
	    search_list: $("nav ul.searches"),
	    container: $("div.container-fluid"),
	    grid: $("#article_grid"),
	    reader: $("#reader"),
	    article_container: $("#article_container"),
	    article: $("#article_container").children("article"),
	    hud: $("#reader_hud"),
	    hud_container: $("#hud_container")
	  },

		events: {
			domain_click: function($target) {
	      var display_query = $target.data("domain"),
	      		query = encodeURI(display_query);
	      if (display_query === "news.ycombinator.com") {
	        Orange.hnsearch.fetch_json(Orange.urls.search_hn("hn", 0), "", 0);
	      } else {
	        Orange.hnsearch.fetch_json(Orange.urls.domain_hn(query, 0), "", 0);
	      }
	      Orange.storage.set("orange_queries", query, display_query);			
			},

			username_click: function($target) {
				var display_query = $target.text(),
	      		query = encodeURI(display_query);
	      Orange.hnsearch.fetch_json(Orange.urls.user_hn(query, 0), "", 0);
	      Orange.storage.set("orange_queries", query, display_query);			
			}
		},

	  extraction: {
	    init: function() {
	      var $visible_articles = Orange.els.grid.children("div").children("article.pre-render:in-viewport"),
	                          i = $visible_articles.length,
	                      $this,
	                    article,
							orange_articles = Orange.articles;

	      if (i) {
	        $visible_articles.addClass("content");
	        while (i--) {
				    (function(e) {
			        setTimeout(function() {
			          $this = $visible_articles.eq(-e),
			          article = orange_articles[$this.data("article")];

			          if (!article.special()) {
									Orange.extraction.request($this, article.url, article.domain)
			          } else {
			            Orange.extraction.complete($this);
			          }
			        }, 0);
				    })(i);	      
	        }   
	      }
	    },

	    request: function(el, url, domain) {
				el.removeClass("pre-render");
	      $.ajax({
	        url: "orange.php?clean=true&url=" + url + "&domain=" + domain,
	        cache: true,
	        success: function(data) {
	          Orange.extraction.success(el, data);
	        },
	        complete: function() {
	          Orange.extraction.complete(el);
	        },
	        timeout: 25000
	      });
	    },

	    success: function(el, data) {
	      el.removeClass("pre-render");

	      var article = Orange.articles[el.data("article")],
	          $images,
	          $best_image;

	      if (article) { 
	        $images = $(data).find("img");

	        if ($images.length) {
	          $best_image = $images.filter(function(i, img) { 
	                          return $(img).hasClass("orange-best-image"); 
	                        }).first();

	          if (!($best_image.length)) {
	            $best_image = $images.sort(Orange.utils.sort.by_image_size).first();
	          }

	          $best_image.clone().prependTo(el).wrap("<div class='thumbnail' />").scaleImage();     
	        }

	        article.content = data;
					if (data.match(/^<p>Sorry, Orange was/) !== null) {
						article.empty = true;
						el.addClass("empty");
					}
	      }
	    },

	    complete: function(el) {
	      el.removeClass("pre-render").find("img.loader").remove();
	    }
	  },

	  hnsearch: {
	    fetch_json: function(url, query, start) {
	      Orange.spinner.show("spinner_one");
	      $.ajax({
	        url: url,
	        dataType: "jsonp",
	        success: function(data) {
	          Orange.hnsearch.parse_json(data.results, url, query, start);
	        },
	        complete: function() {
	          Orange.spinner.hide();
	        },
	        timeout: 25000
	      });
	    },

	    parse_json: function(results, url, query, start) {
	      var result = {},
	          article = {},
	          i = results.length;

	      Orange.search.current = {
	        url: url.replace("&start=" + start, "&start=" + (start + i)),
	        query: query,
	        start: start + i
	      };  

	      delete Orange.articles;
	      Orange.articles = [];

	      while (i--) {
	        this.build_article(results[i].item, query);
	      }

	      this.build_dom();
	    },

	    build_article: function(result, query) {
	      var article = new Orange.article(result),
						domain = article.domain;

				if (domain === "news.ycombinator.com") {
					article.content = article.hn_text;
				} else if (domain === "youtube.com") {
	        article.content = '<iframe width="640" height="360" src="http://www.youtube-nocookie.com/embed/' + article.url.split("v=")[1].split("&")[0] + '" frameborder="0" webkitAllowFullScreen allowfullscreen></iframe>';
	      } else if (domain === "vimeo.com") {
	        article.content = '<iframe src="http://player.vimeo.com/video/' + article.url.split(".com/")[1] + '?title=0&amp;byline=0&amp;portrait=0&amp;color=ff6600" width="640" height="360" frameborder="0" webkitAllowFullScreen allowFullScreen></iframe>';
	      }

	      if (query === "ask") {
	        article.title = article.title.replace(/^Ask HN\: |Ask HN\:|Ask HN - |Ask HN -/i, "");
	      } else if (query === "show") {
	        article.title = article.title.replace(/^Show HN\: |Show HN\:|Show HN - |Show HN -/i, "");
	      }

	      Orange.articles.push(article);

	      delete article;   
	    },

	    build_dom: function() {
	      var article,
	          domain,
	          articles = [],
						orange_articles = Orange.articles,
	          infinite_scroller = "<span class='infinite-scroll pre-render'><span id='spinner_two'></span><a href='#'>More Submissions</a></span>",   
	          i = orange_articles.length,
						article_count = orange_articles.length,
	          article_offset = Orange.constants.MAX_ARTICLES - article_count;


	      while (i--) {
	        article = orange_articles[i],
	        domain = article.domain;

	        articles.push('<article class="item pre-render rendered" title="' + domain + '" data-article="' + i + '" data-delay="' + (article_offset + i) + '"><a class="date" href="' + article.hn_url + '" target="_blank">' + article.published_date + '</a><img width="16" height="16" class="favicon" src="http://' + domain[0] + '.getfavicon.appspot.com/http://' + domain + '?defaulticon=lightpng" alt="' + domain + '" width="16" data-domain="' + domain + '" /><img class="loader" src="http://harrisnovick.com/orange/img/ajax-loader.gif" alt="Loading..." width="16" height="16" /><h3 class="title"><a href="' + article.url + '" target="_blank">' + article.title + '</a></h3><a class="meta user" href="' + article.hn_user_url + '" target="_blank">' + article.user + '</a><div class="meta stats"><a class="trigger points" title="Points" href="#">' + article.points + '</a><span>&nbsp;&#8226;&nbsp;</span><a class="trigger comment-count" title="Comments" href="#">' + article.num_comments + '</a></div></article>');
	      }

	      Orange.spinner.hide();

	      Orange.els.grid.removeClass("rendered").detach().html("<div id='article_wrapper'>" + articles.join("") + "</div>" + infinite_scroller).appendTo(Orange.els.container);
	      this.render_json();    
	    },

	    render_json: function() {
				var els = Orange.els;
	      els.search.hide().find("input.query").val("");
	      els.window.scrollTop(0).trigger("scrollstop");
	      els.grid.addClass("rendered");
	    },

	    fetch_comments: function(sigid, show) {
	      $.ajax({
	        url: Orange.urls.comments_hn(sigid, 0),
	        dataType: "jsonp",
	        cache: true,
	        success: function(data) {
	          Orange.reader.render_comments(data);
	        },
	        complete: function() {
	          if (show) {
	            Orange.els.hud.find("a.comments").click();
	          }
	        },
	        timeout: 10000
	      });
	    }
	  },

	  listeners: {
	    init: function() {
	      this.window();
	      this.article();
	      this.nav();
	      this.search();
	      this.close();
	      this.infinite_scroller();
	      this.hud_container();
	      this.toggle_comments();
	    },

	    article: function() {
	      Orange.els.grid.on("click", "article.item", function(e) {
	        var $target = $(e.target);
	        if ($target.hasClass("title") || $target.hasClass("trigger")) {
	          Orange.reader.show($(this), $target);
	          e.preventDefault();
	        } else if ($target.hasClass("favicon")) {
						Orange.events.domain_click($target);
		        e.preventDefault();
					} else if ($target.hasClass("user")) {
						Orange.events.username_click($target);
		        e.preventDefault();
					}
	      });
	    },

	    close: function() {
	      $("nav").on("click", "a.close", function(e) {
	        var query = $(this).siblings("a").data("search");
	        if (!($("nav .searches li").length)) {
	          Orange.storage.destroy("orange_queries");
	        } else {
	          Orange.storage.remove("orange_queries", query);
	        }
	        e.preventDefault();
	      });
	    },

	    hud_container: function() {
	      Orange.els.hud_container.hover(function() {
	        clearTimeout(Orange.hud_hover_timer);
	        $(this).addClass('hover');
	      }, function() {
	        var $this = $(this);
	        Orange.hud_hover_timer = setTimeout(function() {
	          $this.removeClass('hover');
	        }, 950);
	      });
	    },

	    infinite_scroller: function() {
	      Orange.els.grid.on("click", ".infinite-scroll", function(e) {
	        var current = Orange.search.current,
	            opts = { color: '#FFF' };
	        $(this).find("a").text("");
	        Orange.spinner.show("spinner_two", opts);
	        Orange.hnsearch.fetch_json(current.url, current.query, current.start);
	        e.preventDefault();
	      });
	    },

	    nav: function() {
	      $("nav a:not('.search, .close')").live("click", function(e) {
	        var term = $(this).data("search"),
	            search = "";
	        if (term === "front") {
	          search = Orange.urls.front_hn(0);
	        } else if (term === "ask") {
	          search = Orange.urls.ask_hn(0);
	        } else if (term === "show") {
	          search = Orange.urls.show_hn(0);
	        } else {
	          search = Orange.urls.search_hn(term, 0);
	        }
	        Orange.hnsearch.fetch_json(search, term, 0);
	        e.preventDefault();
	      });
	    },

	    search: function() {
	      var $input = Orange.els.search.find("input.query"),
	          $button = Orange.els.search.find("input.btn");

	      $("nav a.search").click(function(e) {
	        if (!(Orange.els.search.filter(":visible").length)) {
	          Orange.search.show($input, $button);
	        }
	        e.preventDefault();
	      });
	    },

	    toggle_comments: function() {
	      Orange.els.hud.on("click", "a.comments.hidden", function(e) {
	        Orange.els.article_container.scrollTop(0);
	        $("#page_content").hide();
	        $("#article_comments").show();
	        $(this).attr("class", "comments visible");
	        e.preventDefault();
	      });

	      Orange.els.hud.on("click", "a.comments.visible", function(e) {
	        Orange.els.article_container.scrollTop(0);
	        $("#article_comments").hide();
	        $("#page_content").show();
	        $(this).attr("class", "comments hidden");
	        e.preventDefault();
	      });
	    },

	    window: function() {
	      Orange.els.window.bind('scrollstop', function(){
	        Orange.extraction.init();
	      });
	    }
	  },

	  queries: {},

	  reader: { 
	    show: function($this, $target) {
	      this.render_article($this, $target);
	      Orange.els.html.attr("class", "frozen activating");
	    	Orange.els.window.off();
	      this.hide();  
	    },

	    hide: function() {          
	      Orange.els.reader.click(function(e) {
	        if (e.target !== Orange.els.article[0] && !($(e.target).closest("article, #hud_container").length)) {
	          clearTimeout(Orange.hud_timer);
	          Orange.els.html.attr("class", "frozen deactivating");
						Orange.listeners.window();
	          Orange.reader_timer = setTimeout(function() {
							Orange.callbacks.reader_hide();
						}, 500);  
	        }
	      });
	    },

	    render_article: function($this, $target) {
	      var article = Orange.articles[$this.data("article")],
	           domain = article.domain,
							  els = Orange.els;

				els.article.html("<h2 id='article_title'><a href='" + article.url + "' title='" + domain + "'>" + article.title + "</a></h2><div id='page_content'>" + article.content + "</div>");

	      els.hud.find("a.source").attr("href", article.url).attr("title", domain);

	      Orange.hud_timer = setTimeout(function() {
	        els.html.attr("class", "frozen activating activated");
	      }, 1500);

	      if (article.num_comments > 0) {
	        if ($target.hasClass("trigger")) {
	          Orange.hnsearch.fetch_comments(article.sigid, true);
	        } else {
	          Orange.hnsearch.fetch_comments(article.sigid);
	        }
	      }

				els.article.fitVids();	

				if (!article.special()) {
		      try {
		        els.reader.find('code, pre').each(function(i, e) {
		          hljs.highlightBlock(e, '  ');
		        });       
		      } catch(e) {} // One of those rare occasions: http://goo.gl/oQY5Y
				}

	      delete article;
	    },

	    render_comments: function(data) {
	      var results = data.results,
	          i = results.length,
	          comments = ["<div id='article_comments'><ul class='comments'>"],
	          result;

	      if (i > 0) {
	        while (i--) {
	          result = results[i].item;
	          comments.push("<li class='comment' data-id='" + result.id + "' data-parent-id='" + result.parent_id + "'><header><a class='user' href='http://news.ycombinator.com/user?id=" + result.username + "'>" + result.username + "</a></header><p>" + result.text + "</p></li>");
	        }

	        comments.push("</ul></div>");

	        Orange.els.article.append(comments.join(""));
	      }
	    }
	  },

	  search: {
	    current: {
	      url: "",
	      query: "",
	      start: 0      
	    },

	    show: function($input, $button) {
				var els = Orange.els;

	      els.search.show(0, function(){
	        $input.focus();

	        els.window.keypress(function(e) {
	          if(e.keyCode === 13) {
	            $button.click();
	          }
	        });

	        $button.one("click", function() {
	          var display_query = $input.val(),
	              query = encodeURI(display_query);

	          if (display_query === "") {
	            els.search.hide();
	          } else {
	            Orange.hnsearch.fetch_json(Orange.urls.search_hn(query, 0), query, 0);
	            Orange.storage.set("orange_queries", query, display_query);
	          }
	        });

	        Orange.search.hide($button);
	      });     
	    },

	    hide: function($button) {
	      $("body").bind("click", function(event) {
	        if (!($(event.target).closest("#search.popover, nav a.search").length)) {
	          Orange.els.search.hide();
	          $button.unbind("click");
	        }
	      });     
	    }
	  },

	  spinner: {
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
	      this.spinner = new Spinner(Orange.spinner.opts(opts)).spin(document.getElementById(id));
	    },
	
	    hide: function() {
	      this.spinner.stop();
	    }
		},

	  storage: {
	    get: function(item) {
	      if (item === "orange_queries") {
	        Orange.queries = JSON.parse(localStorage.getItem(item)) || {};
	        Orange.callbacks.storage_get();
	        return Orange.queries;        
	      }
	    },

	    set: function(item, key, value) {
	      if (item === "orange_queries") {
	        if (!Orange.queries[key]) {
	          Orange.queries[key] = value;
	          Orange.callbacks.storage_set(key, value);
	          localStorage.setItem(item, JSON.stringify(Orange.queries));
	        }       
	      }
	    },

	    remove: function(item, key) {
	      if (item === "orange_queries") {
	        delete Orange.queries[key];
	        localStorage.setItem(item, JSON.stringify(Orange.queries));
	        Orange.callbacks.storage_remove(key);       
	      }
	    },

	    destroy: function(item) {
	      if (item === "orange_queries") {
	        Orange.queries = {};
	        localStorage.removeItem[item];
	        Orange.callbacks.storage_destroy();        
	      }
	    }
	  },

	  urls: {
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
	  },

	  utils: {
	    sort: {
	      by_image_size: function(a, b) {
	        return (b.width+b.height) - (a.width+a.height);
	      }
	    }
	  }
	};

	Orange.init();
})();