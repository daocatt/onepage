$(function(){
    $('body').ajaxError(function(event, request, settings, err){
        console.log(event);
    });
    $.ajaxSetup({
        cache: false 
    });


    var blog    = {};
    blog.views  = {};
    blog.helper = {};

    blog.helper.build_main_model = function(data){
        var result        = {};
        result.site_name  = data.site_name;
        result.site_description = data.site_description;
        result.site_author = data.site_author;
        result.site_keywords = data.site_keywords;
        result.copyright  = data.copyright;
        result.menulist    = _.map(data.cates, function(cate){
            return {link: '#!cate/'+ cate.name, text: cate.text};
        });
        return result;
    };

    blog.helper.build_sidebar_model = function(data, cate){
        var result   = {};

        var articles = data.articles;
        if(cate){
            articles = _.filter(articles, function(article){return article.cate == cate;});
        }
        
        result.months = _.groupBy(articles, function(article){
            return article.file.substring(0, 7);
        });
        result.months     = _.map(result.months, function(value, key){
            
            return {
                    month: key, 
                    articles: _.map(value, function(article){
                    return {
                            link: article.file,
                            link_title: article.title,
                            cate: article.cate
                            
                        }
                })
            };
        });

        return result;
    };

    blog.helper.markdown = new Showdown.converter();

    blog.views.Sidebar = Backbone.View.extend({
        template: $('#sidebar').html(),
        initialize: function(options){
            this.model = options.model; 
            _.bindAll(this, 'render');
        },
        render: function(){
            var html = Mustache.to_html(this.template, this.model);
            $(this.el).append(html);
            return this;
        }
    });

    blog.views.Article = Backbone.View.extend({
        initialize: function(options){
            var that = this;
            this.article = options.article; 
            this.cate = options.cate;
            _.bindAll(this, 'render');

            var article_path = '';
            if(this.article=='index' && !this.cate){
                article_path = this.article;
            }else{
                article_path = this.cate+'/'+this.article;
            }
            $.get('post/'+article_path+'.md', function(data){
                that.model = data;
                that.render();
            });
        },
        render: function(){
            if(!this.model) return this;
            var html = blog.helper.markdown.makeHtml(this.model);
            $(this.el).html(html);
        }
    });

    blog.views.Main = Backbone.View.extend({
        el:$('.main-body'),
        template: $('#content').html(),
        
        initialize: function(){
            _.bindAll(this, 'render');
            _.bindAll(this, 'sync');
        },
        sync: function(){
            var that = this;
            $.getJSON('meta.js', function(data){
                that.data = data;
                that.render();
            });
        },
        render: function(){
            if(!this.data){
                this.sync();
                return this;
            }

            var main_model = blog.helper.build_main_model(this.data); 
            var main_html = Mustache.to_html(this.template, main_model);
            $(this.el).empty().append(main_html);

            var sidebar_mode = blog.helper.build_sidebar_model(this.data, this.cate);
            var sidebar_view = new blog.views.Sidebar({model: sidebar_mode});
            this.$(".main-sidebar").empty().append(sidebar_view.render().el);

            if(this.cate){
                this.$('.site_menu li a[href="#!cate/'+this.cate+'"]').parent().addClass('active');
            }
            
            if(this.article){
                var article_view = new blog.views.Article({cate: this.cate, article: this.article});
                this.$(".main-content").empty().append(article_view.render().el);
            }
        }
    }); 

    blog.App = Backbone.Router.extend({
        routes: {
            ""                      : "index",
            "!cate/:cate"           : "cate",
            "!show/:cate/:article"        : "show"
        },
        make_main_view: function(cate, article){
            if(!this.main){
                this.main = new blog.views.Main();
            }
            this.main.cate = cate;
            this.main.article = article;
            this.main.render();
        },
        index: function(){
            this.make_main_view(null, 'index');
        },
        cate: function(cate){
            this.make_main_view(cate, 'index');
        },
        show: function(cate,article){
            this.make_main_view(cate, article);
        }
    });

    app = new blog.App();
    Backbone.history.start();
});
