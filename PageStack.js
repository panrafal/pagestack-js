
/**

# Events
* page-ready(e, pagestack, pages) called on window after page load, before showing
* page-open(e, pagestack) called on page just before opening
* page-opened(e, pagestack) called on page after opening
* page-close(e, pagestack) called on page before closing
* page-closed(e, pagestack) called on page after closing

*/
var PageStack = (function(global, $) {

    var PageStack = function(options) {
        this.options = $.extend(true, {}, this.options, options);

        this._initialize();

    };

    PageStack.ATTR_CONTAINER = 'data-ps-container';
    PageStack.ATTR_PAGE = 'data-ps-page';
    PageStack.ATTR_URL = 'data-ps-url';
    PageStack.ATTR_PAGEEVENT = 'data-ps-on';
    PageStack.uniqueId = 1;

    PageStack.animations = {
    };

    PageStack.prototype = {

        $container : null,
        $pagesContainer : null,

        _loading : null,

        /** Default options */
        options : {
            id              : null,
            container       : 'body',
            pagesContainer  : '.ps-pages',
            linksContainer  : true,
            /** Container with links used for navigation. 
                They will be marked with linkActiveClass and used for prev/next navigation 
                Selector, function(context), jQuery(), TRUE to use container, or FALSE to disable
                */ 
            navContainer    : true,

            /** Selector for pages. Use null to set it to .pageClass */
            pageSelector    : null,
            /** Selector for links used for opening */
            linkSelector    : 'a',
            /** Selector for links used in navigation. Use TRUE to match linkSelector */
            navSelector     : true,
            /** If you want the nav-link parent to also receive linkActiveClass - set it's selector */
            navParentSelector : null,

            pageClass       : 'ps-page',
            pageActiveClass : 'ps-active',
            linkActiveClass : 'active',
            removingClass   : 'ps-removing',
            loadingClass    : 'ps-loading',
            tempClass       : 'ps-temp',
            animateClass    : 'ps-animate',

            linkCloseSelector : '.ps-close',
            linkReplaceSelector : '.ps-replace',
            linkReverseSelector : '.ps-reverse',
            linkNextSelector : '.ps-next',
            linkPrevSelector : '.ps-prev',
            linkExternalSelector : '.ps-external',

            animation       : {
                all : {
                    animation   : 'slide',
                    delay       : 0,
                    duration    : 500,
                    easing      : undefined,
                    queue       : true,
                    nextDelay   : 0, // delay for the next animation (in open+close queues)
                    nextOverlap : true, // if next animation should start immediately, or after the first one
                    animateMethod : $.fn.transition !== undefined ? 'transition' : 'animate',
                    /* Animate page's children, not the page itself (good for parallel anims - see loaded) */
                    animateChildren: false,
                    },
                /* Animation called after loading deferred data while using showLoadingPage:true */    
                loaded : {
                    animation   : 'fade',
                    delay       : 0,
                    duration    : 200,
                    queue       : false,
                    animateChildren: true,
                    //animateMethod: 'animate' // transit has problems with multiple animations
                }
            },

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
            if (!this.options.pageSelector) this.options.pageSelector = '.' + this.options.pageClass;
            if (this.options.navSelector === true) this.options.navSelector = this.options.linkSelector;
            this.$container = this._resolveSelector(this.options.container)
                .first()
                .data('pagestack', this)
                ;
            if (!this.options.id) this.options.id = this.$container.attr('id') || PageStack.uniqueId++;
            this.$container.attr(PageStack.ATTR_CONTAINER, this.options.id);
                
            this.getLinksContainer()
                .on('click', this.options.linkSelector, $.proxy(this._onLinkClick, this))
                ;

            this.$pagesContainer = (this._resolveSelector(this.options.pagesContainer, this.$container) || this.$container)
                .first();

            // initialize existing pages 
            var pages = self.getPages();
            pages.each(function() {self._initializePage($(this), {
                url : window.location.toString().replace(window.location.origin, '')
            });});

            // fake-open existing active/last one
            var active = this.getActivePage(true);
            if (active.length) {
                $(function() {
                    self._onPageOpen(active, {});
                    self._onPageOpened(active, {});
                });
            }

        },

        /** Initialize this pagestack as the global one - handling address changes and unhandled urls... */
        _initializeGlobal : function() {

        },

        _initializePage : function(page, options) {
            if (options.url && !page.attr(PageStack.ATTR_URL) && !page.attr('id')) {
                page.attr(PageStack.ATTR_URL, options.url);
            }
            page.attr(PageStack.ATTR_PAGE, this.options.id);
            this._triggerPageEvent(page, 'ready', options);
        },

        getContainer : function() {
            return this.$container;
        },
        getPagesContainer : function() {
            return this.$pagesContainer;
        },
        getLinksContainer : function() {
            return this._resolveSelector(this.options.linksContainer, this.$container, true);
        },
        getNavContainer : function() {
            return this._resolveSelector(this.options.navContainer, this.$container, true);
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

        getPageUrl : function(page, absolute) {
            var url = page.attr(PageStack.ATTR_URL);
            return url;
        },

        getBaseUrl : function() {
            return this.getContainer().attr(PageStack.ATTR_URL);
        },

        /** Returns all navigation links */
        getNavLinks : function() {
            if (!this.options.navSelector) return $();
            return this.getNavContainer().find(this.options.navSelector);
        },

        /** Returns page's navigation link */
        findPageNavLink : function(page, includeParent) {
            if (!this.options.navSelector) return $();

            var url = this.getPageUrl(page, true), 
                selector, hash, result;

            if (!url) return $();
            selector = '[href="' + encodeURI(url) + '"]';
            // relative urls too
            if ((hash = url.indexOf('#')) > url.length - 2) selector += ',[href="' + encodeURI(url.substr(hash)) + '"]';

            result = this.getNavLinks().filter(selector)
                .not(this.options.linkNextSelector)
                .not(this.options.linkPrevSelector)
                .not(this.options.linkCloseSelector)
                ;

            // include the nav parent
            if (includeParent && this.options.navParentSelector) result = result.parents(this.options.navParentSelector).addBack();
            return result;
        },

        findPageNavSybling : function(page, next) {
            var nav = this.findPageNavLink(page, false)
                    .eq(0);
            return nav[next ? 'next' : 'prev'](this.options.navSelector)
                .not(this.options.linkNextSelector)
                .not(this.options.linkPrevSelector)
                .not(this.options.linkCloseSelector)
                ;
        },

        /** Opens specified page, or hides current one if page is null/empty */
        openPage : function(page, options) {
            var current = this.getActivePage(),
                self = this;

            if (!options) options = {};
            page = $(page).eq(0);

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
                    page = self.parsePages(data, page, options);
                    self.openPage(page.eq(0));
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

            if (options.temp) page.addClass(this.options.tempClass);

            // initialize, even again...
            this._initializePage(page, options);

            // open again if already active
            if (page.hasClass(this.options.pageActiveClass)) {
                this._onPageOpen(page, options);
                this._onPageOpened(page, options);
            }

            return page;
        },

        /** Extract multiple pages from data and create them */
        parsePages : function(data, page, options) {
            var self    = this, 
                result  = $();

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

            $(data).each(function() {
                result = result.add(self.createPage($(this), page, options));
                page = null; // dont reuse it anymore
            });

            return result;
        },

        /** Close current page */
        closePage : function() {
            this.getActivePage().addClass(this.options.tempClass);
            this.openPage(this.getLastPage(':not(.' + this.options.pageActiveClass + ')'), {reverse : true});
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
            if (spec === true) return $(context);
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
                animation = $.extend({}, this.options.animation.all, this.options.animation[type] || {}, options);
            
            if (animation.animation && typeof(animation.animation) !== 'function')
                animation.animation = PageStack.animations[animation.animation];

            page.addClass(this.options.animateClass);
            page.addClass(this.options.animateClass + '-' + type);
            if (options.reverse) page.addClass(this.options.animateClass + '-reverse');

            if (next && animation.nextDelay) {
                var oldNext = next;
                next = function() {setTimeout(oldNext, animation.nextDelay);};
            }

            var onFinished = function() {
                self._onAnimationFinished(page, type, options);
                if (next && !animation.nextOverlap) {
                    next();
                }
            };

            if (animation.animation) {
                animation.animation.call(this, animation.animateChildren ? page.children() : page, type, animation, onFinished);
            } else {
                onFinished();
            }
            if (next && animation.nextOverlap) {
                next();
            }
        },
        
        _onAnimationFinished : function(page, type, options) {
            page.removeClass(this.options.animateClass + '-' + type)
                .removeClass(this.options.animateClass)
                .removeClass(this.options.animateClass + '-reverse')
                ;
            if (type === 'close') {
                this._onPageClosed(page, options);
            } else if (type === 'open') {
                this._onPageOpened(page, options);
            }
        },

        _onLinkClick : function(e) {
            var $link = $(e.target), 
                url = $link.attr('href'),
                options = e.pagestackOptions || {},
                nav
                ;

            if (options.replace === undefined) options.replace = $link.is(this.options.linkReplaceSelector);
            if (options.reverse === undefined) options.reverse = $link.is(this.options.linkReverseSelector);

            // check special cases
            if ($link.is(this.options.linkCloseSelector) && this.getPages().length > 1) {
                this.closePage();
                return false;
            } else if ($link.is(this.options.linkNextSelector)) {
                if (this.findPageNavSybling(this.getActivePage(), true).click().length > 0) return false;
            } else if ($link.is(this.options.linkPrevSelector)) {
                var click = jQuery.Event("click");
                options.reverse = true;
                click.pagestackOptions = options;
                if (this.findPageNavSybling(this.getActivePage(), false).trigger(click).length > 0) return false;
            }

            // ignore some links...
            if (!url || url === '' || url.match(/^[\w]+:/)) return;
            if ($link.attr('onclick') || $link.attr('target') || url === '#') return;
            if ($link.is(this.options.linkExternalSelector)) return;
            // ignore local urls we don't have
            if (url[0] === '#' && !this.getPage(url)) return;

            try {

                this.openUrl(url, options);

            } catch (err) {
                if (window.console) console.log(err);
            }
            return false;

        },

        _onPageClose : function(page, options) {
            page.removeClass(this.options.pageActiveClass);
            this.findPageNavLink(page, true).removeClass(this.options.linkActiveClass);
            if (page.hasClass(this.options.tempClass)) {
                page.addClass(this.options.removingClass);
            }
            this._triggerPageEvent(page, 'close', options);
        },


        _onPageOpen : function(page, options) {
            // reset whatever onPageClosed did...
            page.css('display', '');
            page.addClass(this.options.pageActiveClass);
            this.findPageNavLink(page, true).addClass(this.options.linkActiveClass);
            this._triggerPageEvent(page, 'open', options);
            this.cleanupOldPages();
        },

        _onPageClosed : function(page, options) {
            page.css('display', 'none');
            this._triggerPageEvent(page, 'closed', options);
            if (page.hasClass(this.options.removingClass)) {
                page.detach();
                page = null;
            }
        },

        _onPageOpened : function(page, options) {
            this._triggerPageEvent(page, 'opened', options);
        },

        _triggerPageEvent : function(page, event, options) {
            page.trigger('page-'+event+'.pagestack', [this, options]); 
    
            // eval on attributes            
            var code = page.attr(PageStack.ATTR_PAGEEVENT + event);
            if (code) {
                page = page.get(0);
                eval(code);
            }
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

    /** Get pagestack for this element */
    PageStack.getPageStack = function(node) {
        return $(node).closest('[' + PageStack.ATTR_CONTAINER + ']').data('pagestack');
    };

    PageStack.animations.slide = function(page, type, options, next) {
        var width = this.getContainer().innerWidth() + 60,
            left = (type !== 'close' ? 0 : ((options.reverse ? 1 : -1) * width))
        ;
        if (type !== 'close') {
            page.css('left', (options.reverse ? -1 : 1) * width + 'px');
        }
        if (options.delay) page.delay(options.delay, options.queue);
        page[options.animateMethod]({
                left : left + 'px'
            }, {
                duration : options.duration, 
                easing   : options.easing, 
                queue    : options.queue,
                complete : next
            });
    };

    PageStack.animations.fade = function(page, type, options, next) {
        var open = type !== 'close';
        page.css('opacity', open ? 0 : 1);
        if (options.delay) page.delay(options.delay, options.queue);
        page[options.animateMethod]({
                opacity : open ? 1 : 0
            }, {
                duration : options.duration, 
                easing   : options.easing, 
                queue    : options.queue,
                complete : next
            });
    };


    return PageStack;   

})(window, window.jQuery);
