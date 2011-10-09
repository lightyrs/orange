// Author: Harris Novick

var Orange = {

  init: function() {
    Orange.storage.get();
    Orange.hnsearch.fetch_json(Orange.urls.front_hn(0), "front", 0);
    Orange.listeners.init();
  },

  articles: [],

  cache: {},

  callbacks: {
    storage_get: function() {
      var query_list = [];
      $.each(Orange.queries, function(query, display_query) {
        if (query == "hn") {
          query_list.push("<li><a href='#' class='close'>x</a><a href='#' data-search='hn'>news.ycombinator.com</a></li>");
        } else {
          query_list.push("<li><a href='#' class='close'>x</a><a href='#' data-search=" + query + ">" + display_query + "</a></li>");
        }
      });

      $("nav ul.searches").append(query_list.join("")).hide().fadeIn(350);
    },

    storage_set: function(query, display_query) {
      if (query == "hn") {
        var query_list_item = "<li><a href='#' class='close'>x</a><a href='#' data-search='hn'>news.ycombinator.com</a></li>";
      } else {
        var query_list_item = "<li><a href='#' class='close'>x</a><a href='#' data-search=" + query + ">" + display_query + "</a></li>";
      }

      $("nav ul.searches").append(query_list_item).children(":last").hide().fadeIn(100);
    },

		storage_remove: function(query) {
      $("nav ul.searches li a[data-search='" + query + "']").parents("li").fadeOut(180, function() {
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
      $("article.item.pre-render:in-viewport").each(function() {
        var $this = $(this),
            article = Orange.articles[$this.data("article")],
            cache = Orange.cache[article.cache_url];

        if (cache) {
          Orange.extraction.success($this, cache, true);
        } else {
          if (article.domain != "news.ycombinator.com") {
            try {
              Orange.extraction.start($this, article.url, article.domain);
            } catch(e) {
              Orange.extraction.complete($this);
            };
          } else {
            Orange.extraction.complete($this);
          }
        }
      });
    },

    start: function(el, url, domain) {
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
        dataFilter: function(data) {
          try {
            return $(data).wrap("<div>");
          } catch(e) {
            el.addClass("error");
            return $("<div></div>");
          }
        },
        timeout: 30000
      });
    },

    success: function(el, data, cached) {
      el.removeClass("pre-render");

      var article = Orange.articles[el.data("article")],
          init = true,
          article_images,
          best_image;

      if (cached) {
        $(data["thumb"]).appendTo(el.find(".thumbnail")).scaleImage();
        article.content = data["content"];
        Orange.extraction.complete(el);
      } else {
        if (article) {
          article.content = Orange.utils.dispose_of_useless_images(data, article.domain, article.cache_url);

          var cache_article = Orange.cache[article.cache_url] = {};

          article_images = article.content.find("img");

          if (init == true) {
            article_images.load();
          }

          best_image = article_images.sort(Orange.utils.sort.by_image_size)[0] || $("<img src='img/1x1.png' />");

          if (best_image && best_image.width >= 150 && best_image.height >= 120) {
            $(best_image).clone().appendTo(el.find(".thumbnail")).scaleImage();
						cache_article["thumb"] = best_image;
          } else {
            article_images.load(function() {
              if (init == true && best_image && best_image.width >= 150 && best_image.height >= 100) {
                init = false;
                $(best_image).clone().appendTo(el.find(".thumbnail")).scaleImage();
								cache_article["thumb"] = best_image;
              }
            });
          }

          cache_article["content"] = article.content;
        }
      };
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
      if (!append) {
        Orange.articles = [];
      }

      var result = {},
          article = {},
          i = results.length;

      Orange.search = {
        url: url.replace("&start=" + start, "&start=" + (start + i)).replace("&limit=80", "&limit=40"),
        query: query,
        start: start + i
      };

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

        article["hn_user_url"] = "http://news.ycombinator.com/user?id=" + article.user || "";
        article["cache_url"] = Orange.utils.normalize_urls(article.url);

        if (query == "ask") {
          article["title"] = article.title.replace(/^Ask HN\: |Ask HN\:|Ask HN - |Ask HN -/i, "");
        } else if (query == "show") {
          article["title"] = article.title.replace(/^Show HN\: |Show HN\:|Show HN - |Show HN -/i, "");
        }
        Orange.articles.push(article);
      }

      i = Orange.articles.length;

      var articles = [],
          infinite_scroller = "<span class='infinite-scroll pre-render'><span id='spinner_two'></span><a href='#'>More Submissions</a></span>";

      while (i > start) {
        article = Orange.articles[(i-1)]

        articles.push('<article class="item pre-render" title="' + article.domain + '" data-article="' + (i-1) + '"><div class="thumbnail"></div><p class="date"><a href="' + article.hn_url + '" target="_blank">' + article.published_date + '</a></p><a class="favicon" href="' + article.domain + '"><img src="http://g.etfv.co/' + article.url + '?defaulticon=lightpng" alt="' + article.domain + '" /></a><img class="loader" src="http://harrisnovick.com/orange/img/ajax-loader.gif" alt="Loading..." /><h3 class="title"><a href="' + article.url + '" target="_blank">' + article.title + '</a></h3><div class="content"><div class="body article"></div><footer><ul class="meta unstyled"><li class="user"><a href="' + article.hn_user_url + '" target="_blank">' + article.user + '</a></li><li class="points"><img src="img/upvotes.png" alt="points" /><a href="#">' + article.points + '</a></li><li class="comments"><img src="img/comments.png" alt="comments" /><a class="comment-count" href="#">' + article.num_comments + '</a></li></ul></footer></div></article>');

        i--;
      }

      Orange.spinner.hide();

      var previous_articles = Orange.els.grid.children("div").html();

      if (!append) {
        Orange.els.grid.html("<div>" + articles.join("") + "</div>" + infinite_scroller);
        Orange.hnsearch.render_json();
      } else {
        Orange.els.grid.html("<div>" + previous_articles + articles.join("") + "</div>" + infinite_scroller);
        Orange.hnsearch.render_json(true);
      }
    },

    render_json: function(append) {
      Orange.els.search.hide().find("input.query").val("");
      if (!append) {
        $(window).unbind("scrollstop").scrollTop(0);
      } else {
        $("html, body").animate({scrollTop: $(window).scrollTop() + $(window).height() - 32}, 400);
      }
      (function n(e) {
        e.eq(0).addClass("rendered");
        setTimeout(function() {
          n(e.slice(1));
        }, 29);
      })($(".pre-render"));
      Orange.listeners.window();
      Orange.extraction.init();
    },

    fetch_comments: function(sigid, scroll) {
      $.ajax({
        url: Orange.urls.comments_hn(sigid, 0),
        dataType: "jsonp",
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
            $("#article_container").scrollTop($("#article_comments").position().top - 500);
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
        var term = $(this).data("search");
        var search = "";
        if (term == "front") {
          search = Orange.urls.front_hn(0);
        } else if (term == "ask") {
          search = Orange.urls.ask_hn(0);
        } else if (term == "show") {
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
              if(e.keyCode == 13) {
                $button.click();
              }
            });

            $button.one("click", function() {
              var display_query = $input.val(),
                  query = encodeURI(display_query);
              if (display_query == "") {
                Orange.els.search.hide();
              } else {
                Orange.hnsearch.fetch_json(Orange.urls.search_hn(query, 0), query, 0);
                Orange.storage.set(query, display_query);
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
          Orange.storage.destroy();
        } else {
          Orange.storage.remove(query);
        }
        e.preventDefault();
      });
    },

    username: function() {
      Orange.els.grid.delegate("article.item li.user a", "click", function(e) {
        var display_query = $(this).text(),
            query = encodeURI(display_query);
        Orange.hnsearch.fetch_json(Orange.urls.user_hn(query, 0), "", 0);
        Orange.storage.set(query, display_query);
        e.preventDefault();
      });
    },

    domain: function() {
      Orange.els.grid.delegate("article.item a.favicon", "click", function(e) {
        var display_query = $(this).attr("href"),
            query = encodeURI(display_query);
        if (display_query == "news.ycombinator.com") {
          Orange.hnsearch.fetch_json(Orange.urls.search_hn("hn", 0), "", 0);
        } else {
          Orange.hnsearch.fetch_json(Orange.urls.domain_hn(query, 0), "", 0);
        }
        Orange.storage.set(query, display_query);
        e.preventDefault();
      });
    },

    article: function() {
      var $container = $("#article_container");
      var $article = $container.find("article");
      var $page = $article.find(".page");
      var article, $content, filtered_content, $youtube_embed, youtube_url;
      Orange.els.grid.live("click", function(e) {
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
          if ($content) {
            filtered_content = Orange.utils.clean_content($content);
          } else {
            filtered_content = article.hn_text;
          }
          $("html, body").toggleClass("frozen");
          $article.find("#article_title").text(article.title)
            .end().find("#page_content").append(filtered_content).imagefit();

          prettyPrint();

          Orange.els.reader.click(function(e) {
            if (e.target != $page[0] && $(e.target).parents(".page").length < 1) {
              $container.css({
                "-webkit-transform": "translate3d(0px, 0px, 0px) translate(0, 101%)",
                "-moz-transform": "translate3d(0px, 0px, 0px) translate(0, 101%)",
                "-ms-transform": "translate3d(0px, 0px, 0px) translate(0, 101%)",
                "-o-transform": "translate3d(0px, 0px, 0px) translate(0, 101%)",
                "transform": "translate3d(0px, 0px, 0px) translate(0, 101%)",
                "transition": "translate3d(0px, 0px, 0px)"
              });
              Orange.els.reader.css({
                "background-color": "rgba(0, 0, 0, 0)"
              });
              setTimeout(function() {
                $("body, html").removeClass("frozen");
                $container.attr("style", "").scrollTop(0);
                Orange.els.reader.attr("style", "");
                $(e.target).unbind("click").find("#page_content, #article_comments").html("");
              }, 550);
            }
          });
          e.preventDefault();
        }
      });
    },

    infinite_scroller: function() {
      Orange.els.grid.delegate(".infinite-scroll", "click", function(e) {
        var current = Orange.search;
				var opts = {
				  color: '#FFF'
				};
				$(this).find("a").text("");
        Orange.spinner.show("spinner_two", opts);
        Orange.hnsearch.fetch_json(current["url"], current["query"], current["start"]);
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
        lines: opts["lines"] || 16, // The number of lines to draw
        length: opts["length"] || 0, // The length of each line
        width: opts["width"] || 7, // The line thickness
        radius: opts["radius"] || 3, // The radius of the inner circle
        color: opts["color"] || "#F60", // #rgb or #rrggbb
        speed: opts["speed"] || 1.3, // Rounds per second
        trail: opts["trail"] || 50, // Afterglow percentage
        shadow: opts["shadow"] || false // Whether to render a shadow
      }
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
    get: function() {
      Orange.queries = JSON.parse(localStorage.getItem("orange_queries")) || {};
      Orange.callbacks.storage_get();
      return Orange.queries;
    },

    set: function(key, value) {
      if (!Orange.queries[key]) {
				Orange.queries[key] = value;
	      Orange.callbacks.storage_set(key, value);
	      localStorage.setItem('orange_queries', JSON.stringify(Orange.queries));
			}
    },

    remove: function(key) {
      delete Orange.queries[key];
			localStorage.setItem('orange_queries', JSON.stringify(Orange.queries));
			Orange.callbacks.storage_remove(key);
    },

    destroy: function() {
			Orange.queries = {};
      localStorage.removeItem["orange_queries"];
			Orange.callbacks.storage_destroy(key);
    }
  },

  urls: {
    front_hn: function(start) {
      return "http://api.thriftdb.com/api.hnsearch.com/items/_search?weights[title]=1.1&weights[text]=0.7&weights[domain]=2.0&weights[username]=0.1&weights[type]=0.0&boosts[fields][points]=0.15&boosts[fields][num_comments]=0.15&boosts[functions][pow(2,div(div(ms(create_ts,NOW),3600000),72))]=200.0&sortby=product(points,pow(2,div(div(ms(create_ts,NOW),128000),72)))%20desc&filter[fields][type]=submission&limit=30&pretty_print=true&start=" + start
    },
    user_hn: function(user, start) {
      return "http://api.thriftdb.com/api.hnsearch.com/items/_search?filter[fields][username]=" + user + "&sortby=create_ts%20desc&filter[fields][type]=submission&limit=80&start=" + start
    },
    domain_hn: function(domain, start) {
      return "http://api.thriftdb.com/api.hnsearch.com/items/_search?filter[fields][domain]=" + domain + "&sortby=create_ts%20desc&filter[fields][type]=submission&limit=80&start=" + start
    },
    ask_hn: function(start) {
      return "http://api.thriftdb.com/api.hnsearch.com/items/_search?q=ask%20hn&filter[fields][type]=submission&sortby=create_ts%20desc&limit=80&start=" + start
    },
    show_hn: function(start) {
      return "http://api.thriftdb.com/api.hnsearch.com/items/_search?q=show%20hn&filter[fields][type]=submission&sortby=create_ts%20desc&limit=80&start=" + start
    },
    search_hn: function(term, start) {
      return "http://api.thriftdb.com/api.hnsearch.com/items/_search?q=" + term + "&filter[fields][type]=submission&sortby=create_ts%20desc&limit=80&start=" + start
    },
    comments_hn: function(sigid, start) {
      return "http://api.thriftdb.com/api.hnsearch.com/items/_search?filter[fields][type]=comment&filter[fields][parent_sigid]=" + sigid + "&sortby=points%20desc&limit=100&start=" + start
    }
  },

  utils: {
    clean_content: function(content) {
      content.find("pre").addClass("prettyprint");
      return content;
    },

    count_properties: function(obj) {
      var prop,
          propCount = 0;

      for (prop in obj) {
        propCount++;
      }
      return propCount;
    },

    dispose_of_useless_images: function(content, domain, cache_url) {
      var images = content.find("img"),
          i = images.length;

      if (i > 30) {
        images.remove();
      } else {
        var image,
            $image,
            src;

        while (i--) {
          image = images[i];
          $image = $(image);
          src = $image.attr("src");
          if (src.substr(0,7) != "http://") {
            if (src.substr(0,1) == "/") {
              $image.attr("src", ("http://" + domain + src));
            } else if (src.substr(0,1) != "/" || src.substr(0,2) != "./") {
              $image.attr("src", (cache_url + "/" + src));
            } else if (src.substr(0,2) == "./") {
              $image.attr("src", (cache_url + "/" + src.substr(2)));
            }
          }

          if (image.width > 0 && image.width < 150 && image.height > 0 && image.height < 120) {
            $image.remove();
          }
        }
      }
      return content;
    },

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