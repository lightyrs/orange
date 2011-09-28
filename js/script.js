/* Author: Harris Novick

*/

var Orange = {

  init: function() {    
    Orange.cookies.load_queries();

    Orange.hnsearch.fetch_json(Orange.urls.front_hn, "hn");

    Orange.listeners.init();
  },

  cookies: {
    status: function(cookie) {
      return typeof(cookie);
    },    

    queries: function() {
      return $.cookie('orange_queries');
    },

    previous_queries: function() {
      if (Orange.cookies.status(Orange.cookies.queries()) === "object") {
        return [];
      } else {
        return Orange.cookies.queries().split(",");       
      }
    },

    load_queries: function() {
			var queries = "<ul class='searches'>";
      $.map(Orange.cookies.previous_queries(), function(query) {
				queries += "<li><a href='#' class='close'>x</a><a href='#' data-search=" + query + ">" + decodeURI(query) + "</a></li>"
      });    
			queries += "</ul>"
 			$("nav > ul").append(queries).fadeIn(350);
    },

    set_queries: function(value) {
      if (Orange.cookies.status(Orange.cookies.queries()) === "object") {
        var first_cookie = [];
        first_cookie.push(value);
        $.cookie('orange_queries', first_cookie, { expires: 365 });
      } else {
        $.cookie('orange_queries', Orange.cookies.queries() + "," + value);
      }
    },

    remove_queries: function(value) {
      $.cookie('orange_queries', Orange.cookies.queries().replace(value + ",", "").replace("," + value, "").replace(value, ""));
    },

    destroy_queries: function() {
      $.cookie('orange_queries', null);
    }
  },

  spinner: {
    opts: {
      lines: 16, // The number of lines to draw
      length: 0, // The length of each line
      width: 7, // The line thickness
      radius: 3, // The radius of the inner circle
      color: '#F60', // #rgb or #rrggbb
      speed: 1.3, // Rounds per second
      trail: 50, // Afterglow percentage
      shadow: false // Whether to render a shadow     
    },
    show: function() {
      $("#spinner").spin(Orange.spinner.opts);
    },
    hide: function() {
      $("#spinner").spin(false);
    }
  },

  listeners: {
    init: function() {
			Orange.listeners.window();
      Orange.listeners.nav();
      Orange.listeners.search();
      Orange.listeners.close();
      Orange.listeners.article();
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
        if (term === "hn") {
          search = Orange.urls.front_hn;
        } else if (term === "ask") {
					search = Orange.urls.ask_hn;
        } else if (term === "show") {
					search = Orange.urls.show_hn;
				} else {
          search = Orange.urls.search_hn(term);					
				}
        Orange.hnsearch.fetch_json(search, term);
        e.preventDefault();
      });
    }, 

    search: function() {
      var $input = Orange.els.search.find("input.query");
      var $button = Orange.els.search.find("input.btn");     

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
              var display_query = $input.val();
							var query = encodeURI(display_query);
              if (display_query === "") {
                Orange.els.search.hide();
              } else {
                Orange.hnsearch.fetch_json(Orange.urls.search_hn(query), query);
                $("nav ul.searches").append("<li><a href='#' class='close'>x</a><a href='#' data-search=" + query + ">" + display_query + "</a></li>");
                Orange.cookies.set_queries(query);                
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
      $("nav a.close").live("click", function(e) {
        var query = $(this).siblings("a").data("search");
        $(this).parents("li").remove();
        if ($("nav ul.searches li").length < 1) {
          Orange.cookies.destroy_queries();
        } else {
          Orange.cookies.remove_queries(query);
        }
        e.preventDefault();
      });     
    },

    article: function() {
			var $container = $("#article_container");
			var $article = $container.find("article");
			var $page = $article.find(".page");
			var item, $content, filtered_content, $youtube_embed, youtube_url;
      Orange.els.grid.live("click", function(e) {
				if ($(e.target).hasClass("title")) {
					var $this = $(e.target).parents("article.item");
					item = Orange.items[$this.data("item")];
					$content = item.content;
					if ($content) {
						filtered_content = Orange.extraction.clean_content($content);
					}	else {
						filtered_content = item.hn_text;
					}		
	        Orange.els.reader.fadeIn(100);
					$container.stop().animate({
						"margin-top" : "0"
					}, 300);
					$("html, body").toggleClass("frozen");				
					$article.find("#article_title").text(item.title)
						.end().find("#page_content").append(filtered_content).imagefit();
					Orange.hnsearch.fetch_comments(item.sigid);				
					if (item.domain === "youtube.com") {
						$youtube_embed = $article.find("object param[name=movie]");
						youtube_url = $youtube_embed.attr("value");
						$youtube_embed.parents("object").replaceWith('<iframe width="420" height="315" src=' + youtube_url + 'frameborder="0" wmode="opaque" allowfullscreen></iframe>');
					} else {
						prettyPrint();
					}				
					Orange.els.reader.click(function(e) {
						if (e.target !== $page[0] && $(e.target).parents(".page").length < 1) {
							$container.stop().animate({
								"margin-top" : "101%"
							}, 200, function() {
								Orange.els.reader.fadeOut(100, function() {
									$("html, body").toggleClass("frozen");
									$(this).unbind("click").find("#page_content, #article_comments > .comments").html("");									
								});
							});
						}
					});
					e.preventDefault();					
				}
      });
    }
  },

	els: {
		search: $("#search"),
		grid: $("#article_grid"),
		reader: $("#reader")
	},

	urls: {
	  front_hn: "http://api.thriftdb.com/api.hnsearch.com/items/_search?limit=30&sortby=product(points,pow(2,div(div(ms(create_ts,NOW),360000),72)))%20desc&filter[fields][type]=submission&callback=?",
		ask_hn: "http://api.thriftdb.com/api.hnsearch.com/items/_search?q=ask%20hn&filter[fields][create_ts]=[NOW-30DAYS%20TO%20NOW]&filter[fields][type]=submission&sortby=create_ts%20desc&limit=100&callback=?",
		show_hn: "http://api.thriftdb.com/api.hnsearch.com/items/_search?q=show%20hn&filter[fields][create_ts]=[NOW-30DAYS%20TO%20NOW]&filter[fields][type]=submission&sortby=create_ts%20desc&limit=100&callback=?",
	  search_hn: function(term) {
	    return "http://api.thriftdb.com/api.hnsearch.com/items/_search?q=" + term + "&filter[fields][create_ts]=[NOW-30DAYS%20TO%20NOW]&filter[fields][type]=submission&sortby=create_ts%20desc&limit=100&callback=?";
	  },
		comments_hn: function(sigid) {
			return "http://api.thriftdb.com/api.hnsearch.com/items/_search?filter[fields][type]=comment&filter[fields][parent_sigid]=" + sigid + "&sortby=points%20desc&limit=100&callback=?";
		}
	},
	
	hnsearch: {
	  fetch_json: function(url, query) {
	    Orange.spinner.show();
	    $.getJSON(url, function(data) {
	      Orange.hnsearch.parse_json(data.results, query);
	    });
	  },

	  parse_json: function(results, query) {    

	    Orange.items = [];
	
			var result = {},
					item = {},
					i = results.length;
			while (i--) {
			  result = results[i].item;

	      item = {
					sigid: result._id || "",
	        title: result.title || "",
	        hn_text: result.text || "",
					domain: result.domain || "",
	        url: result.url || "http://news.ycombinator.com/user?id=" + result.username || "",
	        points: result.points || "0",
	        num_comments: result.num_comments || "0",
	        user: result.username || "",
	        hn_user_url: "http://news.ycombinator.com/user?id=" + result.username || "",
	        published_date: Date.fromString(result.create_ts).toRelativeTime() || "",
	        hn_url: "http://news.ycombinator.com/item?id=" + result.id || ""
	      };

				if (query === "ask") {
	        item["title"] = item.title.replace(/^Ask HN\: |Ask HN\:|Ask HN - |Ask HN -/i, "");
	      } else if (query === "show") {
	        item["title"] = item.title.replace(/^Show HN\: |Show HN\:|Show HN - |Show HN -/i, "");
	      }
				Orange.items.push(item);
			}
			
			i = Orange.items.length
			var articles_string = "<div>"
			
			while (i--) {
				item = Orange.items[i]
				
				articles_string += '<article class="item pre-render" title="' + item.domain + '" data-item="' + i + '"><div class="thumbnail"></div><p class="date"><a href="' + item.hn_url + '" target="_blank">' + item.published_date + '</a></p><a class="favicon" href="' + item.url + '"></a><img class="loader" src="http://harrisnovick.com/orange/img/ajax-loader.gif" alt="Loading..." /><h3 class="title"><a href="' + item.url + '" target="_blank">' + item.title + '</a></h3><div class="content"><div class="body article"></div><footer><ul class="meta unstyled"><li class="user"><a href="' + item.hn_user_url + '" target="_blank">' + item.user + '</a></li><li class="points"><img src="img/upvotes.png" alt="points" /><a href="#">' + item.points + '</a></li><li class="comments"><img src="img/comments.png" alt="comments" /><a href="#">' + item.num_comments + '</a></li></ul></footer></div></article>';
			}
			
			articles_string += "</div>";

	    Orange.spinner.hide();
			Orange.els.grid.html(articles_string);
			
	    Orange.hnsearch.render_json();
	  },

	  render_json: function() {
	    Orange.els.search.hide().find("input.query").val("");
			$(window).unbind("scrollstop").scrollTop(0);
			(function n(e) {
				e.eq(0).stop().animate({ 
					"opacity" : "1.0"
				}, 29, function() {
					n(e.slice(1));
				});
			})($("article.item"));
			$("article.item .title a").each(function() {
				$(this).favicons({
				  'service': 'http://g.etfv.co/__URL__?defaulticon=lightpng'
				});
		  });
			Orange.listeners.window();
			Orange.extraction.init();
	  },
	
		fetch_comments: function(sigid) {
			$.getJSON(Orange.urls.comments_hn(sigid), function(response) {
				$.each(response.results, function(i, result) {
				  $("#reader #article_comments > .comments").append("<li class='comment'><small>" + result.item.username + "</small><p>" + result.item.text + "</p></li>");
				});
			});
		}
	},
	
	extraction: {
		init: function() {
			$("article.item.pre-render:in-viewport").each(function() {
				var $this = $(this);
				if (Orange.items[$this.data("item")].domain !== "") {
					Orange.extraction.start($this, Orange.items[$this.data("item")].url);       
	      } else {
					Orange.extraction.complete($this);
				}
			});			
		},
		
		start: function(el, url) {
			el.removeClass("pre-render");			
			$.jsonp({
			  url: "http://viewtext.org/api/text?url=" + url + "&rl=false&callback=?",
				success: function(data) {
					Orange.extraction.success(el, data);
				},
				complete: function() {
					Orange.extraction.complete(el);
				},
				timeout: 9000
			});			
		},
		
		success: function(el, data) {
			var item = Orange.items[el.data("item")],
					init = true,
					item_images,
					best_image;
			

			item.content = Orange.extraction.dispose_of_useless_images($(data.content));
			item_images = item.content.find("img").removeAttr("style");
			
      best_image = item_images.sort(Orange.extraction.sort.by_image_size)[0];

      if (best_image && best_image.width >= 150 && best_image.height >= 150) {
        $(best_image).clone().appendTo(el.find(".thumbnail")).scaleImage({ fade: 270 });  
      } else {				
				item_images.load(function() {				
					if (init == true && best_image && best_image.width >= 150) {
						init = false;
						$(best_image).clone().appendTo(el.find(".thumbnail")).scaleImage({ fade: 270 });							
					}
				});
			}				
		},
		
		complete: function(el) {
			el.removeClass("pre-render").find(".loader").remove();
		},
		
		dispose_of_useless_images: function(content) {		
			var images = content.find("img");
			var i = images.length;
			
			if (i > 30) {
				images.remove();
			} else {		
				var image;
				while (i--) {
					image = images[i];
					if (image.width > 0 && image.width < 150 && image.height > 0 && image.height < 150) {
						$(image).remove();
					}
				}			
			}
			return content;
		},
		
	  sort: {
	    by_image_size: function(a, b) {
	      return (b.width+b.height) - (a.width+a.height);
	    }
	  },

		clean_content: function(content) {
			content.find("p a, li a, a, p, li, div").each(function() { 
			  if (!this.childNodes[0] || $(this).hasClass("sidebar")) {
					$(this).remove();
				}
			}).end().find("pre").addClass("prettyprint");
			return content;
		}
	}
};

$.fn.spin = function(opts) {
  this.each(function() {
    var $this = $(this),
        data = $this.data();

    if (data.spinner) {
      data.spinner.stop();
      delete data.spinner;
    }
    if (opts !== false) {
      data.spinner = new Spinner($.extend({color: $this.css('color')}, opts)).spin(this);
    }
  });
  return this;
};

$(Orange.init());