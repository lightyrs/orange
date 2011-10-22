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

      query_list = null;
    },

    storage_set: function(query, display_query) {
      var query_list_item;
      if (query === "hn") {
        query_list_item = "<li><a href='#' class='close'>x</a><a href='#' data-search='hn'>news.ycombinator.com</a></li>";
      } else {
        query_list_item = "<li><a href='#' class='close'>x</a><a href='#' data-search=" + query + ">" + display_query + "</a></li>";
      }

      $("nav ul.searches").append(query_list_item).children(":last").hide().fadeIn(100);

      query_list_item = null;
    },

    storage_remove: function(query) {
      $("nav .searches li a[data-search='" + query + "']").parents("li").fadeOut(180, function() {
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
    window: $(window),
    search: $("#search"),
    container: $("body > div.container-fluid"),
    grid: $("#article_grid"),
    reader: $("#reader")
  },

  extraction: {
    init: function() {
      var $visible_articles = Orange.els.grid.children("div").children("article.pre-render:in-viewport"),
                          i = $visible_articles.length,
                      $this,
                    article;
      
      if (i) {
        $visible_articles.addClass("content");
        while (i--) {
          $this = $visible_articles.eq(-i);
          article = Orange.articles[$this.data("article")];
          
          if (article.domain !== "news.ycombinator.com") {
            setTimeout(Orange.extraction.request($this, article.url, article.domain), 50);
          } else {
            Orange.extraction.complete($this);
          }   
          $this = null;
          article = null;         
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
          Orange.extraction.success(el, data);
          data = null;
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

          $best_image.clone().appendTo(el.find(".thumbnail")).scaleImage();     
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

      Orange.search.current = {
        url: url.replace("&start=" + start, "&start=" + (start + i)),
        query: query,
        start: start + i
      };  
      
      delete Orange.articles;
      Orange.articles = [];

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
        Orange.articles.push(article);

        result = null;
        article = null;
      }

      i = Orange.articles.length;

      while (i--) {
        article = Orange.articles[i];
        domain = article.domain;

        articles.push('<article class="item pre-render" title="' + domain + '" data-article="' + i + '"><div class="thumbnail"></div><p class="date"><a href="' + article.hn_url + '" target="_blank">' + article.published_date + '</a></p><a class="favicon" href="' + domain + '"><img src="http://' + domain[0] + '.getfavicon.appspot.com/http://' + domain + '?defaulticon=lightpng" alt="' + domain + '" width="16" /></a><img class="loader" src="http://harrisnovick.com/orange/img/ajax-loader.gif" alt="Loading..." width="16" height="16" /><h3 class="title"><a href="' + article.url + '" target="_blank">' + article.title + '</a></h3><footer><ul class="meta unstyled"><li class="user"><a href="' + article.hn_user_url + '" target="_blank">' + article.user + '</a></li><li class="points"><img src="img/upvotes.png" alt="points" width="11" height="11" /><a href="#">' + article.points + '</a></li><li class="comments"><img src="img/comments.png" alt="comments" width="13" height="11" /><a class="comment-count" href="#">' + article.num_comments + '</a></li></ul></footer></article>');

        domain = null;
      }

      Orange.spinner.hide();

      Orange.els.grid.detach().html("<div>" + articles.join("") + "</div>" + infinite_scroller).appendTo(Orange.els.container);
      Orange.hnsearch.render_json();

      article = null;
      articles = null;
      results = null;
      infinite_scroller = null;   
    },

    render_json: function() {
      Orange.els.search.hide().find("input.query").val("");
      Orange.els.window.scrollTop(0).trigger("scroll");
      (function n(e) {
        e.eq(0).addClass("rendered");
        var fade_timer = setTimeout(function() {
          n(e.slice(1));
        }, 30);
        if (!(e.length)) {
          clearTimeout(fade_timer);
          fade_timer = null;
        }
      })(Orange.els.grid.find(".pre-render"));
    },

    fetch_comments: function(sigid, scroll) {
      $.ajax({
        url: Orange.urls.comments_hn(sigid, 0),
        dataType: "jsonp",
        cache: true,
        success: function(data) {
          Orange.reader.render_comments(data);
          data = null;
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
      Orange.listeners.article();
      Orange.listeners.nav();
      Orange.listeners.search();
      Orange.listeners.close();
      Orange.listeners.username();
      Orange.listeners.domain();
      Orange.listeners.infinite_scroller();
    },

    article: function() {
      var $this,
          $target;
          
      Orange.els.grid.delegate("article.item", "click", function(e) {
        $target = $(e.target);
        if ($target.hasClass("title") || $target.hasClass("comment-count")) {
          $this = $(this);
          Orange.reader.show($this, $target);
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
          Orange.storage.destroy("orange_queries");
        } else {
          Orange.storage.remove("orange_queries", query);
        }
        e.preventDefault();
      });
    },

    domain: function() {
      Orange.els.grid.delegate(".item a.favicon", "click", function(e) {
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

    infinite_scroller: function() {
      Orange.els.grid.delegate(".infinite-scroll", "click", function(e) {
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

    username: function() {
      Orange.els.grid.delegate(".item .user a", "click", function(e) {
        var display_query = $(this).text(),
            query = encodeURI(display_query);
        Orange.hnsearch.fetch_json(Orange.urls.user_hn(query, 0), "", 0);
        Orange.storage.set("orange_queries", query, display_query);
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
      var $container = $("#article_container"),
          $article = $container.children("article"),
          $page = $article.children(".page"),
          article,
          $content;
  
      $page.remove(); 
  
      $("html").addClass("frozen").removeClass("preloading").addClass("activating");    
      
      article = Orange.articles[$this.data("article")];
      $content = article.content;
  
      if (!$content) {
        $content = article.hn_text;
      }
  
      $page.find("#article_title").text(article.title)
        .end().find("#page_content").html($content)
        .end().appendTo($article);  
      
      if (article.num_comments > 0) {
        if ($target.hasClass("comment-count")) {
          Orange.hnsearch.fetch_comments(article.sigid, true);
        } else {
          Orange.hnsearch.fetch_comments(article.sigid);
        }
      }

      try {
        Orange.els.reader.find('code, pre').each(function(i, e) {
          hljs.highlightBlock(e, '  ');
        });       
      } catch(e) {} // One of those rare occasions: http://goo.gl/oQY5Y      
      
      $page.imagefit();
      
      Orange.reader.hide($page, $container);  
      
      $content = null;
      $article = null;
      $this = null;
      $target = null;   
    },
    
    hide: function($page, $container) { 
      Orange.els.reader.click(function(e) {
        if (e.target !== $page[0] && !($(e.target).parents(".page").length)) {
          $("html").removeClass("activating").addClass("deactivating");
          setTimeout(function() {
            $("html").removeClass("frozen").removeClass("deactivating").addClass("preloading");
            $container.attr("style", "").scrollTop(0);
            $("#page_content, #article_comments").html("");
          }, 500);      
        }
      });
    },
    
    render_comments: function(data) {
      var results = data.results,
          i = results.length,
          comments = ["<ul class='comments'><p class='end-sign'>&#10070;</p><h5 class='header'>Comments</h5>"],
          result;

      if (i > 0) {
        while (i--) {
          result = results[i];
          comments.push("<li class='comment'><header><a class='user' href='http://news.ycombinator.com/user?id=" + result.item.username + "'>" + result.item.username + "</a></header><p>" + result.item.text + "</p></li>");
          result = null;
        }

        comments.push("</ul>");

        $("#article_comments").html(comments.join("")); 
        
        results = null; 
        data = null;
      } else {
        data = null;
        results = null;
        comments = null;
        return;
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
      Orange.els.search.show(0, function(){
        $input.focus();

        Orange.els.window.keypress(function(e) {
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
      return "http://api.thriftdb.com/api.hnsearch.com/items/_search?filter[fields][type]=comment&filter[fields][parent_sigid]=" + sigid + "&sortby=points%20desc&limit=100&start=" + start;
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

$(Orange.init());