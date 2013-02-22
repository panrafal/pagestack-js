
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

    }

    PageStack.ATTR_CONTAINER = 'data-ps-container';
    PageStack.ATTR_PAGE = 'data-ps-page';

    PageStack.prototype = {

        $container : null,
        $pagesContainer : null,
        $navContainer : null,

        /** Default options */
        options = {
            container       : 'body',
            pagesContainer  : '.ps-pages',
            navContainer    : '.ps-nav',

            pageSelector    : '.ps-page',
            navSelector     : 'a',
            linkSelector    : 'a',

            pageActiveClass : 'ps-active',
            linkActiveClass : 'ps-active',
            removingClass   : 'ps-removing',
            loadingClass    : 'ps-loading',
            tempClass       : 'ps-temp',
            linkCloseClass  : 'ps-close',
            linkReplaceClass: 'ps-replace',
            linkReverseClass: 'ps-reverse',
        };

        /** Initialize PageStack */
        _initialize : function() {
            var self = this;
            this.$container = this._resolveSelector(this.options.container)
                .on('click', this.options.linkSelector, $.proxy(_onLinkClick, this))
                .attr(PageStack.ATTR_CONTAINER, 1)
                .data('pagestack', this)
                ;
            this.$pagesContainer = (this._resolveSelector(this.options.pagesContainer, this.$container) || this.$container);
            this.$navContainer = this._resolveSelector(this.options.navContainer, this.$container);

            // initialize existing pages 
            this.getPages().each(function() {self._initializePage($(this));});
            $(global).trigger('page-ready.pagestack', [this, this.getPages()]);
            // fake-open existing active/last one
            this.getActivePage(true)
                .trigger('page-open.pagestack', [this])
                .trigger('page-opened.pagestack', [this]);
        },

        /** Initialize this pagestack as the global one - handling address changes and unhandled urls... */
        _initializeGlobal : function() {

        },

        _initializePage : function(page) {

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
            return this.getPagesContainer().find(this.options.pageSelector);
        },

        /** Returns active page. 
            @return jQuery
        */
        getActivePage : function(useLast) {
            var selector = '.' + this.options.pageActiveClass;
            if (useLast) selector += ':last';
            return this.getPages().filter(selector).first();    
        },

        /** Returns last page. 
            @return jQuery
        */
        getLastPage : function(useLast) {
            return this.getPages().filter(':not(.' + this.options.removingClass + '):last').first();
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
            // TODO
        },

        createPage : function() {

        },

        /** Opens specified page, or hides current one if page is null/empty */
        openPage : function(page, options) {
            var current = this.getActivePage();
            if (page && page.length && current.length && page[0] === current[0]) return;
            // close current
            if (current.length) {
                current.trigger('page-close.pagestack', [this]);
                current.removeClass(this.options.pageActiveClass);
                // when replacing, mark the current as temporary
                if (options.replace) {
                    current.addClass(this.options.tempClass);
                }
                this._animatePage(current, 'hide', options);
            }
            // open new
            if (page && page.length) {
                page.addClass('active');
                
                this._animatePage(page, 'show', options);
                
                this._onPageOpened(page, false);
            }
        },

        openUrl : function(url, options) {
            // TODO
/*
            if (this.isLoading()) this.cancelLoad(true);
            var page;
            if (url) page = this.getPage(url);
            var current = this.getActivePage();
            if (page && page.length && current.length && page[0] === current[0]) return;
            if (current.length) {
                current.trigger('page-close.pagestack', [this]);
                if (options.replace) {
                    current.addClass(this.options.tempClass);
                }
                this.doAnimatePage(current, 'hide', true);
            }
            
            if (url) {
                if (page) {
                    this.doOpenPage(page);
                } else {
                    this.showLoader(true);
                    this.doLoadPage(url);
                }
            } else {
                this.showLoader(true);
            }
*/
        },

        openContent : function(content, options) {
            // TODO
        },

        openDeferred: function(deferred, options) {

        },

        /** Close current page */
        closePage : function() {
            // TODO
            // should open last page if no current
        },

        /** Reload current page */
        reloadPage : function() {
            // TODO
        },

        /** Cancel currently loading page. Bring back the last one... */
        cancelLoad : function(justCancel) {
            // TODO
        },

        isLoading:function() {
            // TODO
        }

        /** Show/hide loading information */
        showLoader:function(show) {
            if (show) {
                this.getPagesContainer().addClass(this.options.loadingClass);
            } else {
                this.getPagesContainer().removeClass(this.options.loadingClass);
            }
        },

        cleanupOldPages : function() {
            // TODO
/*            $(this.$page + '.temp', this.pagesDom).not('.active').detach();
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
            if (typeof(spec) === 'function') return spec(context);
            return $(spec, context);
        },

        _resolveValue : function(spec) {
            if (typeof(spec) === 'function') return spec();
            return spec;
        },


        /**
         * @param type show|hide
         * @param forward true|false
         **/
        _animatePage : function(page, type, options) {
            // TODO
/*            var width = $(this.pagesDom).innerWidth() + 60;
            if (this.reverseAnimation) forward = !forward;
            if (type == 'show') {
                page.css('left', (forward ? 1 : -1) * width + 'px');
                page.css('display', 'block');
            }
            var left = (type == 'show' ? 0 : ((forward ? -1 : 1) * width));
    //        console.log(left);
            var me = this;
            page.animate({
                left : left + 'px'
            }, this.animationTime, false, function() { 
                me.onAnimationFinished($(this), type, forward);
            });
*/      
        },
        
        _onAnimationFinished : function(page, type, options) {
            // TODO
/*            if (type == 'hide') {
                page.css('display', 'none');
                page.trigger('page-closed.pagestack', [page]);
            } else if (type == 'show') {
                page.trigger('page-opened.pagestack', [page]);
            }
            if (page.hasClass('removing')) {
                page.detach();
                page = null;
            }
*/      
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

            } catch (e) {
                if (window.console) console.log(e);
            }
            return false;

        },

        _onPageOpen : function(page) {
            page.trigger('page-open.pagestack', [this]);
            
            this.cleanupOldPages();
        },

    };

    return PageStack;   

})(window, window.jQuery);
