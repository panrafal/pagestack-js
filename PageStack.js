
/*

# Events
* page-ready(e, pagestack, pages) called on window after page load, before showing
* page-open(e, pagestack) called on page just before opening
* page-opened(e, pagestack) called on page after opening
* page-close(e, pagestack) called on page before closing
* page-closed(e, pagestack) called on page after closing

*/
var PageStack = (function(global, $) {

    var PageStack = function(options) {
        this.options = $.extend({}, this.options, options);

        this._initialize();

    };

    PageStack.ATTR_CONTAINER = 'data-ps-container';
    PageStack.ATTR_PAGE = 'data-ps-page';
    PageStack.ATTR_URL = 'data-ps-url';
    PageStack.uniqueId = 1;

    PageStack.animations = {
    };

    PageStack.prototype = {

        $container : null,
        $pagesContainer : null,
        $navContainer : null,

        _loading : null,

        /** Default options */
        options : {
            id              : null,
            container       : 'body',
            pagesContainer  : '.ps-pages',
            navContainer    : '.ps-nav',

            pageSelector    : null,
            navSelector     : 'a',
            linkSelector    : 'a',

            pageClass       : 'ps-page',
            pageActiveClass : 'ps-active',
            linkActiveClass : 'ps-active',
            removingClass   : 'ps-removing',
            loadingClass    : 'ps-loading',
            tempClass       : 'ps-temp',
            linkCloseClass  : 'ps-close',
            linkReplaceClass: 'ps-replace',
            linkReverseClass: 'ps-reverse',
            animatePrefixClass: 'ps-animate-',

            animation       : 'slide',
            animation_open  : undefined,
            animation_close  : undefined,
            animation_loaded: 'fade',
            animationOverlap: false,
            animationDelay  : 0,
            animationDuration: 300,

            pageTemplate    : '<div></div>',
            /** TRUE - placeholder page will be show, replaced inplace with loaded content
                FALSE - current page will be closed. Container will have ps-loading class set
                NULL - nothing will happen. Container will have ps-loading class set
             */
            showLoadingPage : null
        },

        /** Initialize PageStack */
        _initialize : function() {
            var self = this;
            if (!this.options.id) this.options.id = PageStack.uniqueId++;
            if (!this.options.pageSelector) this.options.pageSelector = '.' + this.options.pageClass;
            this.$container = this._resolveSelector(this.options.container)
                .first()
                .on('click', this.options.linkSelector, $.proxy(this._onLinkClick, this))
                .attr(PageStack.ATTR_CONTAINER, this.options.id)
                .data('pagestack', this)
                ;
            this.$pagesContainer = (this._resolveSelector(this.options.pagesContainer, this.$container) || this.$container)
                .first();
            this.$navContainer = this._resolveSelector(this.options.navContainer, this.$container)
                .first();

            // allow other stacks to initialize
            // setTimeout($.proxy(function() {
                // initialize existing pages 
                var pages = self.getPages();
/*                this.getPagesContainer().find(this.options.pageSelector)
                    // but not pages of another pagestack
                    .not(
                        this.getPagesContainer().children('[' + PageStack.ATTR_CONTAINER + ']').find(this.options.pageSelector)
                    );*/                
                pages.each(function() {self._initializePage($(this), {
                    url : window.location.toString().replace(window.location.origin, '')
                });});

                // fake-open existing active/last one
                var active = this.getActivePage(true);
                if (active.length) {
                    this._onPageOpen(active, {});
                    this._onPageOpened(active, {});
                }
            // }, this), 0);

        },

        /** Initialize this pagestack as the global one - handling address changes and unhandled urls... */
        _initializeGlobal : function() {

        },

        _initializePage : function(page, options) {
            if (options.url && !page.attr(PageStack.ATTR_URL) && !page.attr('id')) {
                page.attr(PageStack.ATTR_URL, options.url);
            }
            page.attr(PageStack.ATTR_PAGE, this.options.id);
            $(global).trigger('page-ready.pagestack', [this, page]);
        },

        getContainer : function() {
            return this.$container;
        },
        getPagesContainer : function() {
            return this.$pagesContainer;
        },
        getNavContainer : function() {
            return this.$navContainer;
        },

        /** Returns all pages 
            @return jQuery
        */
        getPages : function() {
            return this.getPagesContainer()
                .children(this.options.pageSelector);
                // .filter('[' + PageStack.ATTR_PAGE + '="' + this.options.id + '"]');
        },

        /** Returns active page. 
            @return jQuery
        */
        getActivePage : function(useLast) {
            var selector = '.' + this.options.pageActiveClass;
            if (useLast) selector += ',:last';
            return this.getPages().filter(selector).last();    
        },

        /** Returns last page. 
            @return jQuery
        */
        getLastPage : function(selector) {
            return this.getPages()
                .filter(':not(.' + this.options.removingClass + ')')
                .filter(selector ? selector : '*')
                .last();
        },

        /** Tries to find global page with a given url and reopen all necessary pagestacks.
            Returns the page on success, null on failure.
         */
        _reopenGlobalPageUrl : function(url, options) {
            // TODO
        },

        /** Get page by URL or ID 
            @return jQuery
        */
        getPage : function(url) {
            var selector = '[' + PageStack.ATTR_URL + '="' + encodeURI(url) + '"]';
            if (url[0] === '#') selector += ', #' + url.substr(1);
            return this.getPages().filter(selector).first();
        },

        getPageUrl : function(page) {
            return page.attr(PageStack.ATTR_URL);
        },

        /** 
        @param content Content to fill the page
        @param page Existing page to reuse (jQuery)
         */
        createPage : function(content, page, options) {
            if (!options) options = {};

            content = $(content);

            if (!page || page.length === 0) {
                if (content && content.hasClass(this.options.pageClass)) {
                    page = content;
                } else {
                    page = $(this.options.pageTemplate)
                            .addClass(this.options.pageClass)
                            ;
                    page.append(content);
                }
                this.getPagesContainer().append(page);
            } else {
                // reuse current page...
                if (content && content.hasClass(this.options.pageClass)) {
                    // we will have to unwrap it and copy the attributes...
                    for (var i = 0, attrs = content.get(0).attributes, l = attrs.length; i<l; ++i) {
                        var name = attrs.item(i).nodeName.toLowerCase(), value = attrs.item(i).nodeValue;
                        if (name === 'class') value = value + ' ' + page.attr(name) ;
                        if (name === 'style') value = value + '; ' + page.attr(name) ;
                        page.attr(name, value);
                        content.attr(name, '');
                    }
                    var contentNode = content.get(0), pageNode = page.get(0);
                    while (contentNode.firstChild) pageNode.appendChild(contentNode.firstChild);
                } else {
                    page.append(content);
                }
                // animate...
                this._animatePage(page, 'loaded', options);
            }

            // initialize, even again...
            this._initializePage(page, options);

            // open again if already active
            if (page.hasClass(this.options.pageActiveClass)) {
                this._onPageOpen(page, options);
                this._onPageOpened(page, options);
            }

            return page;
        },

        /** Opens specified page, or hides current one if page is null/empty */
        openPage : function(page, options) {
            var current = this.getActivePage(),
                self = this;
            if (!options) options = {};

            if (page && page.length && current.length && page[0] === current[0]) return;

            // cancel currently loading
            if (this.isLoading()) this.cancelLoad(true);

            // close current
            if (current.length) {
                // when replacing, mark the current as temporary
                if (options.replace) {
                    current.addClass(this.options.tempClass);
                }
                this._onPageClose(current, options);
            }
            // open new
            if (page && page.length) {
                this._onPageOpen(page, options);
            }
            // animate!
            if (current.length) {
                this._animatePage(current, 'close', options, function() {
                    if (page && page.length) self._animatePage(page, 'open', options);
                });
            } else {
                if (page && page.length) this._animatePage(page, 'open', options);
            }
        },

        openUrl : function(url, options) {
            if (!options) options = {};
            var page = options.reload ? null : this.getPage(url),
                deferred;

            options.url = url;
            if (page && page.length) {
                this.openPage(page, options);
                return page;
            } else {

                try {

                    deferred = jQuery.ajax({
                        url : url,
                        type : 'get',
                        dataType : 'html'
                    });
                    return this.openDeferred(deferred, options);

                } catch (err) {
                    if (console) console.log(err);
                }    

            }
        },

        openContent : function(content, options) {
            if (!options) options = {};
            page = this.createPage(data, page, options);
            this.openPage(page);
            return page;
        },

        openDeferred: function(deferred, options) {
            if (!options) options = {};
            var page, self = this;

            // show or not a loading page
            if (this.options.showLoadingPage) {
                page = this.createPage()
                    .addClass(this.options.loadingClass)
                    .addClass(this.options.tempClass)
                    ;
                this.openPage(page, options);
            } else if (this.options.showLoadingPage !== null) {
                this.openPage(null, options); 
            } 

            this._loading = deferred;

            deferred.done(function(data) {
                if (self._loading === deferred) {
                    self._loading = null;
                    self.showLoader(false);
                    self._onPageLoaded(deferred, data, page, options);
                }
            });
            deferred.fail(function() {
                if (self._loading === deferred) {
                    self._loading = null;
                    self.showLoader(false);
                    self._onPageLoadError();
                    self.closePage();
                }
            });

            return page;

        },

        _onPageLoaded : function(deferred, data, page, options) {

            if (typeof(data) === 'string') {
                // create out-of-document html
                var html = $('<div></div>');
                html.get(0).innerHTML = data;
                // find the page in the same container
                var $container = this.getContainer();
                data = $container.attr('id') ? 
                        html.find('#' + $container.attr('id'))
                            .find(this.options.pageSelector).eq(0)
                            .siblings(this.options.pageSelector).addBack() 
                        : null;
                if (!data || data.length === 0) {
                    // find first-level page and it's siblings
                    data = html.find(this.options.pageSelector).eq(0)
                            .siblings(this.options.pageSelector).addBack();
                }
                // try other parts...
                if (data.length === 0) data = html.find('body');
                if (data.length === 0) data = html;
                // TODO handle multiple pages
            }

            if (page && page.length) {
                // remove temp & loading from the base page...
                page.removeClass(this.options.loadingClass)
                    .removeClass(this.options.tempClass);
            }

            page = this.createPage(data, page, options);
            this.openPage(page);

        },

        /** Close current page */
        closePage : function() {
            this.getActivePage().addClass(this.options.tempClass);
            this.openPage(this.getLastPage(':not(.' + this.options.pageActiveClass + ')'));
        },

        /** Reload current page */
        reloadPage : function(page) {
            if (!page) page = this.getActivePage();
            if (!page.length) return;
            var url = this.getPageUrl(page);
            if (!url) return;
            this.openUrl(url, {reload:true});
        },

        /** Cancel currently loading page. Bring back the last one... */
        cancelLoad : function(justCancel) {
            if (this._loading) {
                this._loading.abort();
                this._loading = null;
                this.showLoader(false);
            }
            if (justCancel) return;
            this.openPage(this.getLastPage());
        },

        isLoading:function() {
            return this._loading !== null;
        },

        /** Show/hide loading information */
        showLoader:function(show) {
            if (show) {
                this.getPagesContainer().addClass(this.options.loadingClass);
            } else {
                this.getPagesContainer().removeClass(this.options.loadingClass);
            }
        },

        cleanupOldPages : function() {
            // this.getPages().filter('.' + this.options.tempClass)
            //     .not('.' + this.options.pageActiveClass)
            //     .detach();
            
            // TODO
/*            
            // clean all old pages
            if (this.pagesLimit) {
                var pages = $(this.$page + '[data-url]', this.pagesDom).not('.active,.persist,.removing');
                if (pages.length > this.pagesLimit) {
                    pages = pages.slice(0, pages.length - this.pagesLimit);
                    pages.detach();
                    console.log('cleanup ' + pages.length);
                }
            }*/
        },

        _resolveSelector : function(spec, context, alwaysReturn) {
            if (!spec) return alwaysReturn ? $() : null;
            if (spec instanceof jQuery) return spec;
            if (typeof(spec) === 'function') return spec.call(this, context);
            return $(spec, context);
        },

        _resolveValue : function(spec) {
            if (typeof(spec) === 'function') return spec.call(this);
            return spec;
        },


        /**
         * @param type show|hide
         * @param forward true|false
         **/
        _animatePage : function(page, type, options, next) {
            var self = this,
                animation = (this.options['animation_' + type] !== undefined ? this.options['animation_' + type]
                            : this.options.animation);
            
            if (animation && typeof(animation) !== 'function')
                animation = PageStack.animations[animation];

            page.addClass(this.options.animatePrefixClass + type);
            if (options.reverse) page.addClass(this.options.animatePrefixClass + 'reverse');
            if (next && this.options.animationDelay) {
                var oldNext = next;
                next = function() {setTimeout(oldNext, this.options.animationDelay);};
            }

            var onFinished = function() {
                self._onAnimationFinished(page, type, options);
                if (next && !self.options.animationOverlap) {
                    next();
                }
            }            

            if (animation) {
                animation.call(this, page, type, this.options.animationDuration, options, onFinished);
            } else {
                onFinished();
            }
            if (next && this.options.animationOverlap) {
                next();
            }
        },
        
        _onAnimationFinished : function(page, type, options) {
            page.removeClass(this.options.animatePrefixClass + type)
                .removeClass(this.options.animatePrefixClass + 'reverse')
                ;
            if (type === 'close') {
                this._onPageClosed(page, options);
            } else if (type === 'open') {
                this._onPageOpened(page, options);
            }
        },

        _onLinkClick : function(e) {
            var $link = $(e.target), 
                url = $link.attr('href')
                ;

            // ignore some links...
            if (!url || url === '' || url.match(/^[\w]+:/)) return;
            if ($link.attr('onclick') || url === '#') return;
            // ignore local urls we don't have
            if (url[0] === '#' && !this.getPage(url)) return;

            try {
                if ($link.hasClass(this.options.linkCloseClass) && this.getPages().length > 1) {
                    this.closePage();
                    return false;
                }

                this.openUrl(url, {
                        replace : $link.hasClass(this.options.linkReplaceClass), 
                        reverse : $link.hasClass(this.options.linkReverseClass)
                    });

            } catch (err) {
                if (window.console) console.log(err);
            }
            return false;

        },

        _onPageClose : function(page, options) {
            page.removeClass(this.options.pageActiveClass);
            if (page.hasClass(this.options.tempClass)) {
                page.addClass(this.options.removingClass);
            }
            page.trigger('page-close.pagestack', [this]);
        },


        _onPageOpen : function(page, options) {
            // reset whatever onPageClosed did...
            page.css('display', '');
            page.addClass(this.options.pageActiveClass);
            page.trigger('page-open.pagestack', [this]);
            this.cleanupOldPages();
        },

        _onPageClosed : function(page, options) {
            page.css('display', 'none');
            page.trigger('page-closed.pagestack', [this]);
            if (page.hasClass(this.options.removingClass)) {
                page.detach();
                page = null;
            }
        },

        _onPageOpened : function(page, options) {
            page.trigger('page-opened.pagestack', [this]);
        },


        _onPageLoadError : function(e, message) {
            console.log('page load error!');
            // TODO
/*            if (e.statusText == 'abort') return;
            console.log('doLoadPage error ' + e.statusText);
            console.log(e);
    //                me.onPageLoaded(url, e.responseText);
            if (!message) message = 'Niestety wystąpił błąd. Spróbuj ponownie.';
            //Zasieg.showErrorPopup(message, 'pageload');
            this.cancelLoad();
*/        }
    };


    PageStack.animations.slide = function(page, type, duration, options, next) {
        var width = this.getContainer().innerWidth() + 60,
            self = this,
            left = (type !== 'close' ? 0 : ((options.reverse ? 1 : -1) * width))
        ;
        if (type !== 'close') {
            page.css('left', (options.reverse ? -1 : 1) * width + 'px');
        }
        page.animate({
            left : left + 'px'
        }, duration, false, next);
    };

    PageStack.animations.fade = function(page, type, duration, options, next) {
        var open = type !== 'close';
        if (options.reverse) open = !open;
        page.css('opacity', open ? 0 : 1);
        page.animate({
            opacity : open ? 1 : 0
        }, duration, false, next);
    };


    return PageStack;   

})(window, window.jQuery);
