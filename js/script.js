// Author: Harris Novick

var Orange = {

  init: function() {
    Orange.storage.get("orange_queries");
    Orange.hnsearch.fetch_json(Orange.urls.front_hn(0), "front", 0);
    Orange.listeners.init();
  },

  articles: [],
	
  callbacks: {
    storage_get: function() {
      var query_list = [];
      $.each(Orange.queries, function(query, display_query) {
        if (query === "hn") {
          query_list.push("<li><a href='#' class='close'>x</a><a href='#' data-search='hn'>news.ycombinator.com</a></li>");
        } else {
          query_list.push("<li><a href='#' class='close'>x</a><a href='#' data-search=" + query + ">" + display_query + "</a></li>");
        }
      });

      $("nav ul.searches").append(query_list.join("")).hide().fadeIn(350);
    },

    storage_set: function(query, display_query) {
      var query_list_item;
      if (query === "hn") {
        query_list_item = "<li><a href='#' class='close'>x</a><a href='#' data-search='hn'>news.ycombinator.com</a></li>";
      } else {
        query_list_item = "<li><a href='#' class='close'>x</a><a href='#' data-search=" + query + ">" + display_query + "</a></li>";
      }

      $("nav ul.searches").append(query_list_item).children(":last").hide().fadeIn(100);
    },

    storage_remove: function(query) {
      $("nav ul.searches li a[data-search='" + query + "']").parents("li").fadeOut(180, function() {
        $(this).remove();
      });     
    },

    storage_destroy: function() {
      $("nav ul.searches").fadeOut(180, function() {
        $(this).remove();
      });     
    }
  },

  els: {
    search: $("#search"),
    grid: $("#article_grid"),
    reader: $("#reader")
  },

  extraction: {
    init: function() {
			$.each(Orange.els.grid.find("article.item.pre-render:in-viewport"), function(i, item) {
				var $this = $(item),
        		article = Orange.articles[$this.data("article")];

        if (article.domain !== "news.ycombinator.com") {
          Orange.extraction.start($this, article.url, article.domain);
        } else {
          Orange.extraction.complete($this);
        }				
			});
    },

    start: function(el, url, domain) {
      el.removeClass("pre-render");
      $.ajax({
        url: "orange.php?clean=true&url=" + url + "&domain=" + domain + "&as232f32=?",
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

				if ($images.length > 0) {
					$best_image = $images.filter(function(i, img) { 
													return $(img).hasClass("orange-best-image"); 
												}).first();

					if ($best_image.length === 0) {
						$best_image = $images.sort(Orange.utils.sort.by_image_size).first();
					}

					$best_image.clone().appendTo(el.find(".thumbnail")).scaleImage();					
				}

				article.content = data;					
			}
    },

    complete: function(el) {
      el.removeClass("pre-render").find(".loader").remove();
    }
  },

  hnsearch: {
    fetch_json: function(url, query, start) {
      Orange.spinner.show("spinner_one");
      $.ajax({
        url: url,
        dataType: "jsonp",
        success: function(data) {
          var results = data.results;
          if (start > 0) {
            Orange.hnsearch.parse_json(results, url, query, start, true);
          } else {
            Orange.hnsearch.parse_json(results, url, query, start);
          }
        },
        complete: function() {
          Orange.spinner.hide();
        },
        timeout: 15000
      });
    },

    parse_json: function(results, url, query, start, append) {
      var result = {},
          article = {},
          i = results.length;

      Orange.search = {
        url: url.replace("&start=" + start, "&start=" + (start + i)),
        query: query,
        start: start + i
      };	
	
			if (start > 0 && (start % 150 === 0)) {
				append = false;
				restart = 0;
			} else if (start > 150 && (start % 150 !== 0)){
				restart = Orange.articles.length;
			} else {
				restart = start;
			}
			
      if (!append) {
        Orange.articles = [];
      }

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
        article.normal_url = Orange.utils.normalize_urls(article.url);

        if (query === "ask") {
          article.title = article.title.replace(/^Ask HN\: |Ask HN\:|Ask HN - |Ask HN -/i, "");
        } else if (query === "show") {
          article.title = article.title.replace(/^Show HN\: |Show HN\:|Show HN - |Show HN -/i, "");
        }
        Orange.articles.push(article);
      }

      i = Orange.articles.length;

      var articles = [],
          infinite_scroller = "<span class='infinite-scroll pre-render'><span id='spinner_two'></span><a href='#'>More Submissions</a></span>",
					domain;

      while (i > restart) {
        article = Orange.articles[(i-1)];
				domain = article.domain;

        articles.push('<article class="item pre-render" title="' + domain + '" data-article="' + (i-1) + '"><div class="thumbnail"></div><p class="date"><a href="' + article.hn_url + '" target="_blank">' + article.published_date + '</a></p><a class="favicon" href="' + domain + '"><img src="http://' + domain[0] + '.getfavicon.appspot.com/http://' + domain + '?defaulticon=lightpng" alt="' + domain + '" width="16" /></a><img class="loader" src="http://harrisnovick.com/orange/img/ajax-loader.gif" alt="Loading..." width="16" height="16" /><h3 class="title"><a href="' + article.url + '" target="_blank">' + article.title + '</a></h3><footer><ul class="meta unstyled"><li class="user"><a href="' + article.hn_user_url + '" target="_blank">' + article.user + '</a></li><li class="points"><img src="img/upvotes.png" alt="points" width="11" height="11" /><a href="#">' + article.points + '</a></li><li class="comments"><img src="img/comments.png" alt="comments" width="13" height="11" /><a class="comment-count" href="#">' + article.num_comments + '</a></li></ul></footer></article>');

        i--;
      }

      Orange.spinner.hide();

      if (!append) {
        Orange.els.grid.html("<div>" + articles.join("") + "</div>" + infinite_scroller);
        Orange.hnsearch.render_json();
      } else {
				var previous_articles_html = Orange.els.grid.children("div").html();								
        Orange.els.grid.html("<div>" + previous_articles_html + articles.join("") + "</div>" + infinite_scroller);
        Orange.hnsearch.render_json(true);
      }
    },

    render_json: function(append) {
      Orange.els.search.hide().find("input.query").val("");
      if (!append) {
				$(window).scrollTop(0).trigger("scroll");
      } else {
        $("html, body").animate({scrollTop: $(window).scrollTop() + $(window).height() - 22}, 400);
      }
      (function n(e) {
        e.eq(0).addClass("rendered");
        var fade_timer = setTimeout(function() {
          n(e.slice(1));
        }, 30);
        if (e.length === 0) {
          clearTimeout(fade_timer);
        }
      })($(".pre-render"));
    },

    fetch_comments: function(sigid, scroll) {
      $.ajax({
        url: Orange.urls.comments_hn(sigid, 0),
        dataType: "jsonp",
        cache: true,
        success: function(data) {
          var results = data.results,
              i = results.length,
              comments = ["<ul class='comments'><p class='end-sign'>&#10070;</p><h5 class='header'>Comments</h5>"],
              result;

          if (i > 0) {
            while (i--) {
              result = results[i];
              comments.push("<li class='comment'><header><a class='user' href='http://news.ycombinator.com/user?id=" + result.item.username + "'>" + result.item.username + "</a></header><p>" + result.item.text + "</p></li>");
            }

            comments.push("</ul>");
            $("#reader #article_comments").html(comments.join(""));
          } else {
            return;
          }
        },
        complete: function() {
          if (scroll) {
            $("#article_container").scrollTop($("#article_comments").position().top - 530);
          }
        },
        timeout: 10000
      });
    }
  },

  listeners: {
    init: function() {
      Orange.listeners.window();
      Orange.listeners.nav();
      Orange.listeners.search();
      Orange.listeners.close();
      Orange.listeners.username();
      Orange.listeners.domain();
      Orange.listeners.article();
      Orange.listeners.infinite_scroller();
    },

    window: function() {
      $(window).bind('scrollstop', function(){
        Orange.extraction.init();
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
        if (Orange.els.search.filter(":visible").length < 1) {
          Orange.els.search.show(0, function(){
            $input.focus();

            $(window).keypress(function(e) {
              if(e.keyCode === 13) {
                $button.click();
              }
            });

            $button.one("click", function() {
              var display_query = $input.val(),
                  query = encodeURI(display_query);
              if (display_query === "") {
                Orange.els.search.hide();
              } else {
                Orange.hnsearch.fetch_json(Orange.urls.search_hn(query, 0), query, 0);
                Orange.storage.set("orange_queries", query, display_query);
              }
            });

            $("body").bind("click", function(event) {
              if ($(event.target).closest(".search.popover, nav a.search").length < 1) {
                Orange.els.search.hide();
                $button.unbind("click");
              }
            });
          });
        }
        e.preventDefault();
      });
    },

    close: function() {
      $("nav").delegate("a.close", "click", function(e) {
        var query = $(this).siblings("a").data("search");
        if ($("nav ul.searches li").length < 1) {
          Orange.storage.destroy("orange_queries");
        } else {
          Orange.storage.remove("orange_queries", query);
        }
        e.preventDefault();
      });
    },

    username: function() {
      Orange.els.grid.delegate("article.item li.user a", "click", function(e) {
        var display_query = $(this).text(),
            query = encodeURI(display_query);
        Orange.hnsearch.fetch_json(Orange.urls.user_hn(query, 0), "", 0);
        Orange.storage.set("orange_queries", query, display_query);
        e.preventDefault();
      });
    },

    domain: function() {
      Orange.els.grid.delegate("article.item a.favicon", "click", function(e) {
        var display_query = $(this).attr("href"),
            query = encodeURI(display_query);
        if (display_query === "news.ycombinator.com") {
          Orange.hnsearch.fetch_json(Orange.urls.search_hn("hn", 0), "", 0);
        } else {
          Orange.hnsearch.fetch_json(Orange.urls.domain_hn(query, 0), "", 0);
        }
        Orange.storage.set("orange_queries", query, display_query);
        e.preventDefault();
      });
    },

    article: function() {
      var $shadows = Orange.els.reader.find(".shadow"),
          $container = $("#article_container"),
          $article = $container.find("article"),
          $page = $article.find(".page"),
          article,
          $content;
          
      Orange.els.grid.delegate("article.item", "click", function(e) {
        if ($(e.target).hasClass("title") || $(e.target).hasClass("comment-count")) {
          var $this = $(e.target).parents("article.item");
          article = Orange.articles[$this.data("article")];
          $content = article.content;
          if (article.num_comments > 0) {
            if ($(e.target).hasClass("comment-count")) {
              Orange.hnsearch.fetch_comments(article.sigid, true);
            } else {
              Orange.hnsearch.fetch_comments(article.sigid);
            }
          }
          if (!$content) {
            $content = article.hn_text;
          }
					$("html, body").addClass("frozen");
          $article.find("#article_title").text(article.title)
            .end().find("#page_content").html($content).imagefit();

          try {
            Orange.els.reader.find('pre').each(function(i, e) {
							hljs.highlightBlock(e, '  ');
						});
            Orange.els.reader.find('code').each(function(i, e) {
							hljs.highlightBlock(e, '  ');
						});           
          } catch(e) {
            
          }
					
          Orange.els.reader.click(function(e) {
            if (e.target !== $page[0] && $(e.target).parents(".page").length < 1) {
              $container.css({
                "-webkit-transform": "translate3d(0, 100%, 0)",
                "-moz-transform": "translate3d(0, 100%, 0)",
                "-ms-transform": "translate3d(0, 100%, 0)",
                "-o-transform": "translate3d(0, 100%, 0)",
                "transform": "translate3d(0, 100%, 0)"
              });
              Orange.els.reader.css({
                "background-color": "rgba(0, 0, 0, 0)"
              });
              $shadows.css("opacity","0");
              setTimeout(function() {
                $("body, html").removeClass("frozen");
                $container.attr("style", "").scrollTop(0);
                Orange.els.reader.attr("style", "");
                $shadows.attr("style", "");
                $(e.target).unbind("click").find("#page_content, #article_comments").html("");
              }, 420);
            }
          });
          e.preventDefault();
        }
      });
    },

    infinite_scroller: function() {
      Orange.els.grid.delegate(".infinite-scroll", "click", function(e) {
        var current = Orange.search,
            opts = { color: '#FFF' };
        $(this).find("a").text("");
        Orange.spinner.show("spinner_two", opts);
        Orange.hnsearch.fetch_json(current.url, current.query, current.start);
        e.preventDefault();
      });
    }
  },

  queries: {},

  search: {
    url: "",
    query: "",
    start: 0
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
      var target = document.getElementById(id);
      window.spinner = new Spinner(Orange.spinner.opts(opts)).spin(target);
    },
    hide: function() {
      window.spinner.stop();
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
      return "http://api.thriftdb.com/api.hnsearch.com/items/_search?weights[title]=1.1&weights[text]=0.7&weights[domain]=2.0&weights[username]=0.1&weights[type]=0.0&boosts[fields][points]=0.15&boosts[fields][num_comments]=0.15&boosts[functions][pow(2,div(div(ms(create_ts,NOW),3600000),72))]=200.0&sortby=product(points,pow(2,div(div(ms(create_ts,NOW),128000),72)))%20desc&filter[fields][type]=submission&limit=30&pretty_print=true&start=" + start;
    },
    user_hn: function(user, start) {
      return "http://api.thriftdb.com/api.hnsearch.com/items/_search?filter[fields][username]=" + user + "&sortby=create_ts%20desc&filter[fields][type]=submission&limit=30&start=" + start;
    },
    domain_hn: function(domain, start) {
      return "http://api.thriftdb.com/api.hnsearch.com/items/_search?filter[fields][domain]=" + domain + "&sortby=create_ts%20desc&filter[fields][type]=submission&limit=30&start=" + start;
    },
    ask_hn: function(start) {
      return "http://api.thriftdb.com/api.hnsearch.com/items/_search?q=ask%20hn&filter[fields][type]=submission&sortby=create_ts%20desc&limit=30&start=" + start;
    },
    show_hn: function(start) {
      return "http://api.thriftdb.com/api.hnsearch.com/items/_search?q=show%20hn&filter[fields][type]=submission&sortby=create_ts%20desc&limit=30&start=" + start;
    },
    search_hn: function(term, start) {
      return "http://api.thriftdb.com/api.hnsearch.com/items/_search?q=" + term + "&filter[fields][type]=submission&sortby=create_ts%20desc&limit=30&start=" + start;
    },
    comments_hn: function(sigid, start) {
      return "http://api.thriftdb.com/api.hnsearch.com/items/_search?filter[fields][type]=comment&filter[fields][parent_sigid]=" + sigid + "&sortby=points%20desc&limit=100&start=" + start;
    }
  },

  utils: {
    normalize_urls: function(url) {
      url = url.split("//");
      url = url[1] || "" + url;
      while (!url.match(/[a-zA-Z0-9]$/))  {
        url = url.substring(0, url.length-1);
      }
      return "http://" + url;
    },

    sort: {
      by_image_size: function(a, b) {
        return (b.width+b.height) - (a.width+a.height);
      }
    }
  }
};

$(Orange.init());