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
      $.map(Orange.cookies.previous_queries(), function(query) {
        $("nav ul.searches").hide().append("<li><a href='#' class='close'>x</a><a href='#' data-search=" + query + ">" + decodeURI(query) + "</a></li>").fadeIn(350);      
      });     
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
        if ($(".search.popover:visible").length < 1) {
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
              if (query === "") {
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
			var $container = Orange.els.reader.find("#article_container");
			var $article = $container.find("article");
			var $page = $article.find(".page");
			var $content, filtered_content, $youtube_embed, youtube_url;
      $("article.item", $("section.content")[0]).live("click", function(e) {
				var $this = $(this);
				if (e.target === $this.find("h3.title")[0]) {
					$content = $this.find(".article.body").clone();
					if ($content.text() !== "") {
						filtered_content = Orange.extraction.clean_content($content);
					}	else {
						filtered_content = $this.data("tmplItem").data.hn_text;
					}		
	        Orange.els.reader.fadeIn(100);
					$container.stop().animate({
						"margin-top" : "0"
					}, 300);
					$("html, body").toggleClass("frozen");				
					$article.find("#article_title").text($this.data("tmplItem").data.title)
						.end().find("#page_content").append(filtered_content).imagefit();
					Orange.hnsearch.fetch_comments($this.data("tmplItem").data.sigid);				
					if ($this.attr("title") == "youtube.com") {
						$youtube_embed = $article.find("object param[name=movie]");
						youtube_url = $youtube_embed.attr("value");
						$youtube_embed.parents("object").replaceWith('<iframe width="420" height="315" src=' + youtube_url + 'frameborder="0" wmode="opaque" allowfullscreen></iframe>');
					} else {
						prettyPrint();
					}				
					Orange.els.reader.click(function(e) {
						if (e.target !== $page[0] && $(e.target).parents(".page").length < 1) {
							$container.animate({
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

  sort: {
    by_image_width: function(a, b) {
      return b.width - a.width;
    }
  },

	els: {
		search: $(".search.popover"),
		reader: $("#reader"),
		
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

			var show_hn_vM = {};
			var result = {};

			var i = results.length;
			while (i--) {
			  result = results[i].item;

	      var item = {
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
				Orange.items.unshift(item);
			}

	    Orange.spinner.hide();

	    show_hn_vM = {
	      items: Orange.items
	    };

	    ko.applyBindings(show_hn_vM);

	    Orange.hnsearch.render_json();
	  },

	  render_json: function() {
	    Orange.els.search.hide().find("input.query").val("");
			$(window).unbind("scrollstop").scrollTop(0);
			(function n(e) {
				e.eq(0).stop().fadeIn(29, function() {
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
				if ($this.attr("title") !== "") {
					Orange.extraction.start($this, $this.data("tmplItem").data.url);       
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
      var $thumbnail = el.find(".thumbnail");
			var content = data.content;
			var init = true;
			var $body = el.find(".article.body");
			
			try {
				var trimmed_content = Orange.extraction.dispose_of_useless_images($(content));
	      $(trimmed_content).appendTo($body);

	      var images = trimmed_content.find("img").sort(Orange.sort.by_image_width);

	      if (images[0] && images[0].width > 190 && images[0].height > 50) {
	        images.first().clone().appendTo($thumbnail).scaleImage({ fade: 270 });  
	      } else {		
					$body.find("img").load(function() {					
						if (init == true) {
							images = Orange.extraction.dispose_of_useless_images($body).find("img").sort(Orange.sort.by_image_width);
							var best_image = images[0];
							if (best_image && best_image.width > 190 && best_image.height > 50) {
								init = false;
								$(best_image).clone().appendTo($thumbnail).scaleImage({ fade: 270 });							
							}
						}
					});
				}				
			} catch(e) {
				
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
					if ((image.height < 10 && image.height > 0) || (image.width < 100 && image.width > 0)) {
						$(image).remove();
					}
				}			
			}
			return content;
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