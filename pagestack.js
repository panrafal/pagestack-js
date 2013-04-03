/*
 * PageStack JS
 * 
 * https://github.com/panrafal/pagestack-js
 *
 * Copyright (c)2013 Rafal Lindemann
 * 
 * For the full copyright and license information, please view the LICENSE
 * file that was distributed with this source code.
 */

/**

PageStack is a global class. You can extend is as you want, as practically everything is accessible.
Be aware that functions and properties prefixed with '_' are *internal* and may change without prior notice.

# Events
* page-ready(e, pagestack) called on page after page load, before showing
* page-open(e, pagestack) called on page just before opening
* page-opened(e, pagestack) called on page after opening
* page-close(e, pagestack) called on page before closing
* page-closed(e, pagestack) called on page after closing
* page-destroy(e, pagestack) called on page just before destroying

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
    
    var URLPARTS_REGEX = /^([a-z]+:\/\/[^\/]+)?((.*?)(?:\?(.+?))?)(?:#(.*))?$/i;
    var URLPART_ORIGIN = 1; // not implemented...
    var URLPART_URI = 2;
    var URLPART_PATH = 3;
    var URLPART_QUERY = 4;
    var URLPART_HASH = 5;    

    PageStack.animations = {
    };

    PageStack._urlHistory = {};

    PageStack.prototype = {

        $container : null,
        $pagesContainer : null,

        _loading : null,

        /** Default options */
        options : {
            /** ID of this pagestack. ID attribute of the container will be used if null */
            id              : null,
            /** Pagestack container. 
                A selector, function(context), or jQuery()

                You should NOT use id (#ID) - as in some situations the same pagestack may exist twice!
            */
            container       : '.ps-container',
            /** Container to put the pages in 
            A selector, function(context), jQuery() or TRUE to use container
            */
            pagesContainer  : '.ps-pages',
            /** Container to catch the links in
            A selector, function(context), jQuery() or TRUE to use container
            */
            linksContainer  : true,
            /** Container with links used for navigation. 
                They will be marked with linkActiveClass and used for prev/next navigation 
                Selector, function(context), jQuery(), TRUE to use container, or FALSE to disable
                */ 
            navContainer    : true,

            initialUrl      : undefined,

            /** Selector for pages. Use null to set it to .pageClass */
            pageSelector    : null,
            /** Selector for links used for opening */
            linkSelector    : 'a',
            /** Selector for links used in navigation. Use TRUE to match linkSelector */
            navSelector     : true,
            /** If you want the nav-link parent to also receive linkActiveClass - set it's selector */
            navParentSelector : null,

            /** Only urls passing this regular expression will be handled by this pagestack */
            urlFilter       : false,

            history         : true,

            /** CSS class for pages */
            pageClass       : 'ps-page',
            pageActiveClass : 'ps-active',
            linkActiveClass : 'active',
            destroyingClass : 'ps-destroying',
            loadingClass    : 'ps-loading',
            animateClass    : 'ps-animate',
            /** Pages with this class will be always destroyed after closing */
            temporaryClass  : 'ps-temporary',
            /** Pages with this class will be always left after closing */
            permanentClass  : 'ps-permanent',

            /** Maximum number of pages to keep in memory. Pages with `permanentClass` class will
            always be kept and excluded from the count. Pages with `temporaryClass` class
            will always be removed.
            Use 0 not to keep any pages, or -1 to keep all of them.
             */
            pagesLimit      : 0,

            /** These pages will not be saved in history */
            nohistorySelector : '.ps-nohistory',
            linkCloseSelector : '.ps-close',
            linkReplaceSelector : '.ps-replace',
            linkBackwardSelector : '.ps-backward',
            linkNextSelector : '.ps-next',
            linkPrevSelector : '.ps-prev',
            linkExternalSelector : '.ps-external',

            hashPrefix       : 'ps-',

            titleAttribute  : 'data-title',

            /** Options for scrollTo (if available) */
            scroll : {duration : 500},

            animation : {
                all : {
                    motion      : 'slide',
                    delay       : 0,
                    duration    : 500,
                    easing      : undefined,
                    queue       : true,
                    nextDelay   : 0, // delay for the next animation (in open+close queues)
                    nextOverlap : false, // if next animation should start immediately, or after the first one
                    animateMethod : $.fn.transition !== undefined ? 'transition' : 'animate',
                    /* Animate page's children, not the page itself (good for parallel anims - see loaded) */
                    animateChildren: false,
                    animateClass: true
                    },
                /* Animation called after loading deferred data while using showLoadingPage:true */    
                loaded : {
                    motion      : 'fade',
                    delay       : 0,
                    duration    : 200,
                    queue       : false,
                    animateChildren: true,
                    //animateMethod: 'animate' // transit has problems with multiple animations
                },
                resize : {
                    motion      : 'containerResize',
                    duration    : 200,
                    animateChildren: false,
                    animateClass : false
                }
            },

            pageTemplate    : '<div></div>',

            /** TRUE - placeholder page will be show, replaced inplace with loaded content
                FALSE - current page will be closed. Container will have ps-loading class set
                NULL - nothing will happen. Container will have ps-loading class set
             */
            showLoadingPage : false,

            /** Callback function accepting(url, options) and returning:
                FALSE if URL is not handled at all
                NULL for default handling
                STRING with content
                jQuery with content
                Deferred object */
            contentProvider : null,
                    
            /** When enabled, container will be resized on page open and window resize. It will
                accomodate the active page, and will use resize animation.
                You can resize by hand using resizeContainer().
                You can specify the interval in ms to keep the container constantly updated.
                */
            autoResize      : false
        },

        /** Initialize PageStack */
        _initialize : function() {
            var self = this, url;
            if (!this.options.pageSelector) this.options.pageSelector = '.' + this.options.pageClass;
            if (this.options.navSelector === true) this.options.navSelector = this.options.linkSelector;
            this.$container = this._resolveSelector(this.options.container)
                .not('[' + PageStack.ATTR_CONTAINER + ']')
                .first()
                .data('pagestack', this)
                ;
            if (!this.$container.length) throw new Error('Pagestack container is missing or already occupied!');
            if (!this.options.id) this.options.id = this.$container.attr('id') || PageStack.uniqueId++;
            this.uniqueId = this.options.id + '-' + PageStack.uniqueId++;
            this.$container.attr(PageStack.ATTR_CONTAINER, this.options.id);

            if (this.options.history && !$.address) this.options.history = false;
            if (this.options.history) PageStack._initializeGlobalHistory();
                
            this.getLinksContainer()
                .on('click.pagestack.pagestack-' + this.uniqueId, this.options.linkSelector, $.proxy(this._onLinkClick, this))
                ;

            this.$pagesContainer = (this._resolveSelector(this.options.pagesContainer, this.$container) || this.$container)
                .first();

            if (this.options.autoResize === true) $(window).on('resize.pagestack.pagestack-' + this.uniqueId, $.proxy(this.resizeContainer, this));
            else this._autoResizeTimeout = window.setTimeout($.proxy(this.resizeContainer, this), this.options.autoResize);

            var initializeLater = $.proxy(function () {

                    // guess the stack's url by searching for parent stacks
                    var parentStack = PageStack.getPageStack(this.$container.parent());
                    if (parentStack) {
                        if (!parentStack.initialized) {
                            setTimeout(initializeLater, 0);
                            return;
                        }
                        url = parentStack.getPageUrl( parentStack.getPages().has(this.$container) ) || parentStack.getBaseUrl();
                    } else {
                        url = window.location.toString().replace(window.location.origin, '');
                        if (this.options.initialUrl === undefined) this.options.initialUrl = url;
                    }
                    // set base url on the stack
                    if (!this.$container.attr(PageStack.ATTR_URL)) {
                        this.$container.attr(PageStack.ATTR_URL, url.match(URLPARTS_REGEX)[URLPART_URI]);
                    }

                    // initialize existing pages 
                    var pages = self.getPages();
                    pages.each(function() {self._initializePage($(this), {
                        url : url.match(URLPARTS_REGEX)[URLPART_URI]
                    });});

                    this._openLoadedPages(pages, {
                        url : this.options.initialUrl,
                        animation : false,
                        firstOpening : true
                    });

                    this.initialized = true;

                }, this)

            setTimeout(initializeLater, 0);
        },

        _deinitialize : function() {
            if (!this.initialized) return;
            
            $(window).off('pagestack-' + this.uniqueId);
            
            if (this._autoResizeTimeout) window.clearTimeout(this._autoResizeTimeout);
            
            this.initialized = false;
        },

        _initializePage : function(page, options) {
            if (!page.attr(PageStack.ATTR_URL)) {
                var urlParts = (options.url || '').match(URLPARTS_REGEX);
                // remember the page's URL, or use stack's url
                page.attr(PageStack.ATTR_URL, urlParts[URLPART_URI] || this.getBaseUrl());
                // set page's id if it's missing and it's dynamically generated page
                // if (urlParts[URLPART_HASH] && !page.attr('id')) page.attr('id', urlParts[URLPART_HASH]);
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
                .filter(':not(.' + this.options.destroyingClass + ')')
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
            var parts = url.match(URLPARTS_REGEX), 
                selector = '';
            if (parts[URLPART_URI]) selector += '[' + PageStack.ATTR_URL + '="' + encodeURI(parts[URLPART_URI]) + '"]';
            if (parts[URLPART_HASH]) selector += '[id="' + encodeURI(parts[URLPART_HASH]) + '"]';
            return this.getPages().filter(selector).first();
        },

        /** Returns page's URL */
        getPageUrl : function(page, absolute, host) {
            if (absolute === undefined) absolute = true;
            var url, id;
            if (!page || typeof page === 'string') {
                url = page || '';
            } else {
                url = page.attr(PageStack.ATTR_URL);
                id = page.attr('id');
            }

            if (!absolute && id && url == this.getBaseUrl()) url = '';
            else if ((absolute || !id) && !url) url = this.getBaseUrl();

            if (host) url = window.location.protocol + '//' + window.location.hostname + url;

            if (id) url += '#' + id;
            return url;
        },

        /** Return URL of this pagestack */
        getBaseUrl : function() {
            return this.getContainer().attr(PageStack.ATTR_URL);
        },

        /** Returns all navigation links */
        getNavLinks : function() {
            if (!this.options.navSelector) return $();
            return this.getNavContainer().find(this.options.navSelector)
                .not(this.options.linkNextSelector)
                .not(this.options.linkPrevSelector)
                .not(this.options.linkCloseSelector)
//                .not('[href^="#' + this.options.hashPrefix + '"]')
                ;
        },

        /** Returns page's navigation link */
        findPageNavLink : function(page, includeParent) {
            if (!this.options.navSelector) return $();

            var url = this.getPageUrl(page, true), 
                selector, hash, result,
                urlParts = url.match(URLPARTS_REGEX);

            if (!url) return $();

            selector = '[href="' + encodeURI(url) + '"]';
            // relative urls too
            if (urlParts[URLPART_HASH]) selector += ',[href="#' + encodeURI(urlParts[URLPART_HASH]) + '"]';

            result = this.getNavLinks().filter(selector);

            // include the nav parent
            if (includeParent && this.options.navParentSelector) result = result.parents(this.options.navParentSelector).addBack();
            return result;
        },

        findPageNavSybling : function(page, next, loop) {
            var nav = this.findPageNavLink(page, false)
                    .eq(0),
                links = this.getNavLinks().toArray(),
                index = links.indexOf(nav.get(0));
            if (next) {
                if (index < 0 || index >= links.length -1) return loop ? $(links[0]) : $();
                return $(links[index + 1]);
            } else {
                if (index <= 0) return loop ? $(links[links.length - 1]) : $();
                return $(links[index - 1]);
            }
        },

        /** Opens specified page, or just closes current one if `page` is null/empty 

        Options:
            - history : true/false
            - animation : animation options or false to disable it altogether
            - backward : play motion backwards - for 'show' from right to left, but not from visible to hidden
            - replace : replace current page with this one
            - temporary : make the opened page temporary
        */
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
                if (options.replace) current.addClass(this.options.temporaryClass);
                this._onPageClose(current, options);
            }
            // open new
            if (page && page.length) {
                this._onPageOpen(page, options);
                if (options.temporary) page.addClass(this.options.temporaryClass);
            }
            // animate! but if it's not during open animation
            if (current.length) {
                this._animatePage(current, 'close', options, function() {
                    if (page && page.length) self._animatePage(page, 'open', options);
                });
            } else {
                if (page && page.length) this._animatePage(page, 'open', options);
            }
            if (page && page.length && this.options.scroll) this.scrollIntoView(page, this.options.scroll);
        },

        /** Tries to find existing page with that URL, or resolve and load one.
            If a page is needed immediately, pass `showLoadingPage:true` in options
            @return Existing page, loading page or NULL when waiting. FALSE if URL is not supported.
          */
        loadPageUrl : function(url, options) {
            if (!options) options = {};
            var page = options.reload ? null : this.getPage(url),
                deferred, 
                urlParts = url.match(URLPARTS_REGEX);

            options.url = url;
            options.urlPath = urlParts[URLPART_URI];
            options.urlHash = urlParts[URLPART_HASH];
            if (page && page.length) {
                return page;
            } else if (options.urlHash && this.options.hashPrefix && options.urlHash.indexOf(this.options.hashPrefix) === 0) {
                // special hash
                return this.loadSpecialId(options.urlHash.substr(this.options.hashPrefix.length), options);
            } else {
                deferred = this.resolveUrl(url, options);
                if (deferred === false) return false;
                if (!deferred) throw new Error('URL ' + url + ' is not handled!');
                return this.createPageFromDeferred(deferred, options);
            }

        },

        /** Resolves URL into Deferred object. Done callback should provide the page content as the first argument 
        @return FALSE if URL is not supported
                NULL for default handling
                STRING with content
                jQuery with content
                Deferred object 
        */
        resolveUrl : function(url, options) {
            if (this.options.contentProvider) {
                var result = this.options.contentProvider.call(this, url, options);
                if (result !== null && result !== undefined) return result;
            }
            // remove hash from url
            url = url.replace(/#.+/, '');
            if (!url) return false;
            return $.ajax({
                url : url,
                type : 'get',
                dataType : 'html'
            });
        },

        loadSpecialId : function(id, options) {
            var url, page;
            switch(id) {
                case 'first':
                    url = this.getNavLinks().first().attr('href');
                    break;
                case 'last':
                    url = this.getNavLinks().last().attr('href');
                    break;
                case 'prev':
                    url = this.findPageNavSybling(this.getActivePage(), false).attr('href');
                    break;
                case 'next':
                    url = this.findPageNavSybling(this.getActivePage(), true).attr('href');
                    break;
                case 'next-page':
                    if ((page = this.getActivePage().next(this.options.pageSelector)).length) return page;
                case 'first-page':
                    return this.getPages().first();
                case 'prev-page':
                    if ((page = this.getActivePage().prev(this.options.pageSelector)).length) return page;
                case 'last-page':
                    return this.getPages().last();
            }
            if (url) {
                return this.loadPageUrl(url, options);
            }
            return null;
        },

        /** Opens specified URL.
            @return Existing page, loading page or NULL when waiting. FALSE if URL is not supported. */
        openUrl : function(url, options) {
            var self = this;
            if (!options) options = {};
            var oldOnSuccess = options.onSuccess;
            options.onSuccess = function(page) {
                if (oldOnSuccess) oldOnSuccess(page);
                self._openLoadedPages(page, options);
            };
            var page = this.loadPageUrl(url, options);
            if (page && page.length) {
                // disable the callback if it's not a loading page
                if (!page.hasClass(this.options.loadingClass)) options.onSuccess = oldOnSuccess;
                self.openPage(page, options);
            }
            return page;
        },

        /** Opens page with specified content */
        openContent : function(content, options) {
            if (!options) options = {};
            var page = this.parsePages(content, null, options);
            this.openPage(page);
            return page;
        },

        /** Creates a page from a deferred object.
            Options:
            - showLoadingPage
            - onSuccess - callback(page) when the loading is complete
            @return jQuery page if showLoadingPage was TRUE
         */
        createPageFromDeferred: function(deferred, options) {
            if (!options) options = {};
            if (options.showLoadingPage === undefined) options.showLoadingPage = this.options.showLoadingPage;
            var page, self = this, content;

            if (typeof deferred === 'function') deferred = deferred.call(this, options);
            // ductype Deferred
            if (!deferred.state || !deferred.fail || !deferred.done) {
                // this seems to be content!
                content = deferred;
                deferred = $.Deferred();
                deferred.resolve(content);
            }

            // show or not a loading page
            if (deferred.state() === 'pending') {
                self.showLoader(true);
                if (options.showLoadingPage) {
                    page = this.createPage(null, null, options)
                        .addClass(this.options.loadingClass)
                        .addClass(this.options.temporaryClass)
                        ;
                    this.openPage(page, options);
                } else if (options.showLoadingPage !== null) {
                    this.openPage(null, options); 
                } 
            }

            this._loading = deferred;

            deferred.done(function(data) {
                if (self._loading === deferred) {
                    self._loading = null;
                    self.showLoader(false);
                    page = self.parsePages(data, page, options);
                    if (options.onSuccess) options.onSuccess(page);
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

            var urlParts = (options.url || '').match(URLPARTS_REGEX);

            content = $(content);

            if (content.length === 1 && content.parent().is(this.getPagesContainer())) {
                // this is already a on-stack page!
                return content;
            }

            if (!page || page.length === 0) {
                if (content && content.hasClass(this.options.pageClass)) {
                    page = content;
                } else {
                    page = $(this.options.pageTemplate)
                            .addClass(this.options.pageClass)
                            ;
                    page.append(content);
                    // set id for dynamic pages
                    if (urlParts[URLPART_HASH] && !page.attr('id')) page.attr('id', urlParts[URLPART_HASH]);
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
                    while (contentNode.firstChild) page.append(contentNode.firstChild);
                } else {
                    page.append(content);
                    // set id for dynamic pages
                    if (urlParts[URLPART_HASH] && !page.attr('id')) page.attr('id', urlParts[URLPART_HASH]);
                }
                // animate...
                this._animatePage(page, 'loaded', options);
            }
            
            if (this.options.titleAttribute && options.title && !page.attr(this.options.titleAttribute)) {
                page.attr(this.options.titleAttribute, options.title);
            }
            if (options.temp) page.addClass(this.options.temporaryClass);

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
                if (options.title === undefined) options.title = html.find('title:eq(0)').text();
                data = html.find($container.attr('id') ? '#' + $container.attr('id')
                                : (typeof this.options.container === 'string' && 
                                        this.options.container !== 'body' ? 
                                            this.options.container : '>*')
                            )
                            .find(this.options.pageSelector).eq(0)
                            .siblings(this.options.pageSelector).addBack();
//                if (!data || data.length === 0) {
//                    // find first-level page and it's siblings
//                    data = html.find(this.options.pageSelector).eq(0)
//                            .siblings(this.options.pageSelector).addBack();
//                }
                // try other parts...
                if (data.length === 0) data = html.find('body');
                if (data.length === 0) data = html;
                // TODO handle multiple pages
            }

            if (page && page.length) {
                // remove temp & loading from the base page...
                page.removeClass(this.options.loadingClass)
                    .removeClass(this.options.temporaryClass);
            }

            data = $(data);

            if (!data.length) return result;

            // create the page with ordered id, or first...
            var urlParts = (options.url || '').match(URLPARTS_REGEX),
                first;
            if (urlParts[URLPART_HASH]) first = data.filter('[id="' + encodeURI(urlParts[URLPART_HASH]) + '"]');
            if (!first || !first.length) first = data.first();

            result = result.add(self.createPage(first, page, options));

            // create the rest
            data.not(first).each(function() {
                result = result.add(self.createPage($(this), null, options));
            });

            return result;
        },

        /** Close current page */
        closePage : function() {
            this.getActivePage().addClass(this.options.temporaryClass);
            this.openPage(this.getLastPage(':not(.' + this.options.pageActiveClass + ')'), {backward : true});
        },

        /** Reload current page */
        reloadPage : function(page) {
            if (!page) page = this.getActivePage();
            if (!page.length) return;
            var url = this.getPageUrl(page, true);
            if (!url) return;
            this.openUrl(url, {reload:true});
        },

        /** Cancel currently loading page. Bring back the last one... */
        cancelLoad : function(justCancel) {
            if (this._loading) {
                if (this._loading.abort) this._loading.abort();
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

        resizeContainer : function(options) {
            // reset timeout counter
            if (this._autoResizeTimeout && typeof this.options.autoResize === 'number') {
                window.clearTimeout(this._autoResizeTimeout);
                this._autoResizeTimeout = window.setTimeout($.proxy(this.resizeContainer, this), this.options.autoResize);
            }
            if (this.getPagesContainer().is(':visible') === false) return;
            if (!options) options = {};
            this._animatePage(this.getPagesContainer(), 'resize', options);
        },

        removePage : function(page) {
            // uninitialize any child pagestacks
            page.find('[' + PageStack.ATTR_CONTAINER + ']').each(function() {
                PageStack.getPageStack(this)._deinitialize();
            });
            this._triggerPageEvent(page, 'destroy', {});
            page.remove();
        },

        scrollIntoView : function(page, options) {
            var winh = $(window).height(),
                winy = $(window).scrollTop(),
                pagey = $(page).offset().top,
                margin = 0.1
                ;
                
            if (pagey > winy - winh * margin && pagey < winy + winh - winh * margin) {
                // in view already
                return;
            }
                
            if ($.fn.scrollTo) {
                $(window).scrollTo(page, options);
            } else {
                $(window).scrollTop(pagey - winh * margin);
            }
        },

        _cleanupOldPages : function() {
            // clean all old pages
            if (this.options.pagesLimit >= 0) {
                var pages = this.getPages().not(
                        '.' + this.options.pageActiveClass + 
                        ', .' + this.options.permanentClass + 
                        ', .' + this.options.destroyingClass + 
                        ', [class*="' + this.options.animateClass + '"]'),
                    self = this;
                if (pages.length > this.options.pagesLimit) {
                    pages = pages.slice(0, pages.length - this.options.pagesLimit);
                    pages.each(function() {
                        self.removePage($(this));
                    });
                }
            }
        },

        /* Finishes opening procedure on freshly loaded pages.
        Called only after page open or deferred load.
        */
        _openLoadedPages : function(pages, options) {
            var self = this,
                urlParts = (options.url || '').match(URLPARTS_REGEX),
                page = null;
            pages = $(pages);

            // got hash?
            if (urlParts[URLPART_HASH]) {
                // search for static page
                page = pages.filter('[id="' + encodeURI(urlParts[URLPART_HASH]) + '"]');
                // try dynamic page
                if (!page.length) {
                    options.showLoadingPage = true;
                    if (this.openUrl('#' + urlParts[URLPART_HASH], options) !== false) {
                        return; // opened dynamically...
                    } else {
                        // mark child pagestacks with the url to open... maybe they will be able to handle this...
                        pages.find('[' + PageStack.ATTR_CONTAINER + ']').each(function() {
                            PageStack.getPageStack(this).options.initialUrl = '#' + urlParts[URLPART_HASH];
                        });
                    }
                }
            } 

            if (!pages.length) return; // from now on we need them badly!

            // open marked as active, or the first one...
            if (!page || !page.length) {
                page = pages.filter(this.options.pageActiveClass);
                if (page.length === 0) page = pages.first();
            }

            // on first opening, nothing should be active...
            if (options.firstOpening) {
                pages.removeClass(this.options.pageActiveClass);
                // run events when the page is fully loaded
                $(function() {
                    self._onPageOpen(page, options);
                    self._onPageOpened(page, options);
                });
            } else if (!page.hasClass(this.options.pageActiveClass)) {
                // page could be already activated by loading page
                this.openPage(page, options);
            }
        },

        _resolveSelector : function(spec, context, alwaysReturn) {
            if (!spec) return alwaysReturn ? $() : null;
            if (spec === true) return $(context);
            if (spec instanceof $) return spec;
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
            page.removeClass(this.options.animateClass + '-wait');
            if (options.animation === false) {
                this._onAnimationFinished(page, type, options);      
                if (next) next();
                return;
            }
            var self = this,
                animation = $.extend({}, 
                    this.options.animation.all, 
                    this.options.animation[type] || {}, 
                    options, 
                    options.animation || {});
            
            if (animation.motion && typeof(animation.motion) !== 'function')
                animation.motion = PageStack.animations[animation.motion];

            if (animation.animateClass) {
                page.addClass(animation.animateClass === true ? 
                        this.options.animateClass + ' ' + this.options.animateClass + '-' + type :
                        animation.animateClass);
            }
            if (options.backward) page.addClass(this.options.animateClass + '-backward');

            if (next && animation.nextDelay) {
                var oldNext = next;
                next = function() {setTimeout(oldNext, animation.nextDelay);};
            }

            var onFinished = function() {
                self._onAnimationFinished(page, type, animation);
                if (next && !animation.nextOverlap) {
                    next();
                }
            };

            if (animation.motion) {
                animation.motion.call(this, animation.animateChildren ? page.children() : page, type, animation, onFinished);
            } else {
                onFinished();
            }
            if (next && animation.nextOverlap) {
                next();
            }
        },
        
        _onAnimationFinished : function(page, type, options) {
            if (options.animation !== false) {
                if (options.animateClass) {
                    page.removeClass(options.animateClass === true ? 
                            this.options.animateClass + ' ' + this.options.animateClass + '-' + type :
                            options.animateClass);
                }
                if (options.backward) page.removeClass(this.options.animateClass + '-backward');
            }
            
            if (type === 'close') {
                this._onPageClosed(page, options);
            } else if (type === 'open') {
                this._onPageOpened(page, options);
            }
        },

        _onLinkClick : function(e) {
            var $link = $(e.currentTarget), 
                url = $link.attr('href'),
                options = e.pagestackOptions || {},
                nav
                ;

            if (options.replace === undefined) options.replace = $link.is(this.options.linkReplaceSelector);
            if (options.backward === undefined) options.backward = $link.is(this.options.linkBackwardSelector);
            if (options.history === undefined && $link.is(this.options.nohistorySelector)) options.history = false;
            if (options.temporary === undefined && $link.hasClass(this.options.temporaryClass)) options.temporary = true;

            // check special cases
            if ($link.is(this.options.linkCloseSelector)) {
                if (this.getPages().length > 1) {
                    this.closePage();
                    return false;
                } else options.backward = true;
            } else if ($link.is(this.options.linkNextSelector)) {
                if (this.findPageNavSybling(this.getActivePage(), true).click().length > 0) return false;
            } else if ($link.is(this.options.linkPrevSelector)) {
                var click = $.Event("click");
                options.backward = true;
                click.pagestackOptions = options;
                if (this.findPageNavSybling(this.getActivePage(), false).trigger(click).length > 0) return false;
            }

            // ignore some links...
            if (this.options.urlFilter) {
                if (typeof this.options.urlFilter === 'function') {
                    if (!this.options.urlFilter.call(this, url, $link)) return;
                } else {
                    if (!url.match(this.options.urlFilter)) return;
                }
            }
            if (!url || url === '' || url.match(/^[\w]+:/)) return;
            if ($link.attr('onclick') || $link.attr('target') || url === '#') return;
            if ($link.is(this.options.linkExternalSelector)) return;

            if (this.openUrl(url, options) === false) {
                // this URL is not supported...
                return;
            }

            return false;

        },

        _onPageClose : function(page, options) {
            page.removeClass(this.options.pageActiveClass);
            this.findPageNavLink(page, true).removeClass(this.options.linkActiveClass);
            if (page.hasClass(this.options.temporaryClass)) {
                page.addClass(this.options.destroyingClass);
            }
            this._triggerPageEvent(page, 'close', options);
        },


        _onPageOpen : function(page, options) {
            var title;
            page.addClass(this.options.pageActiveClass);
            page.addClass(this.options.animateClass + '-wait');
            this.findPageNavLink(page, true).addClass(this.options.linkActiveClass);
            this._triggerPageEvent(page, 'open', options);
            if (this.options.titleAttribute && $.address && (title = page.attr(this.options.titleAttribute))) {
                $.address.title(title);
            }
            // store in history stack if not a loading page or first opening
            if ((this.options.history || options.history) && 
                    options.history !== false &&
                    !options.firstOpening &&
                    !page.is(this.options.loadingClass) && 
                    !page.is(this.options.nohistorySelector)
            ) {
                var url = this.getPageUrl(page, true);
                PageStack._urlHistory[url] = this.getBaseUrl();
                $.address.value(url);
            }
            if (this.options.autoResize) {
                this.resizeContainer(
                    options.firstOpening || options.animation === false ? {animation : {duration : 0, delay : 0}} : {}
                );
            }
        },

        _onPageClosed : function(page, options) {
            // page.css('display', 'none');
            this._triggerPageEvent(page, 'closed', options);
            if (page.hasClass(this.options.destroyingClass)) {
                this.removePage(page);
                page = null;
            }
            this._cleanupOldPages();
        },

        _onPageOpened : function(page, options) {
            page.removeClass(this.options.animateClass + '-wait');
            if (page.hasClass(this.options.pageActiveClass) !== false) {
                // is it closed?
                this._triggerPageEvent(page, 'opened', options);
            }
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
        }
    };

    PageStack.parseUrl = function(url) {
        url = url.match(URLPARTS_REGEX);
        return {
            origin : url[URLPART_ORIGIN],
            uri    : url[URLPART_URI],
            path   : url[URLPART_PATH],
            query  : url[URLPART_QUERY],
            hash   : url[URLPART_HASH]
        };
    };

    /** Get pagestack for this element */
    PageStack.getPageStack = function(node, returnJQuery) {
        var found = $(node).closest('[' + PageStack.ATTR_CONTAINER + ']');
        return returnJQuery ? found : found.data('pagestack');
    };

    PageStack._initializeGlobalHistory = function() {
        var self = this;
        if (this._initializedGlobalHistory) return;
        this._initializedGlobalHistory = true;
        $(function() {
            setTimeout(function() {
                $.address.externalChange($.proxy(self._onExternalAddressChange, self));
            }, 250);
        });
    };

    PageStack._onExternalAddressChange = function(event) {
        var url = event.value,
            urlParts = url.match(URLPARTS_REGEX),
            selector = '', page, container, parentStack;
        console.log(event);

        // find page with this url
        selector = '[' + PageStack.ATTR_PAGE + ']';
        selector += '[' + PageStack.ATTR_URL + '="' + encodeURI(urlParts[URLPART_URI]) + '"]';
        if (urlParts[URLPART_HASH]) selector += '[id="' + encodeURI(urlParts[URLPART_HASH]) + '"]';
        selector += ':first';

        page = $(selector);
        container = page.length ? PageStack.getPageStack(page, true) : $();

        // get container from the history
        if (!container.length && PageStack._urlHistory[url]) {
            container = $(
                '[' + PageStack.ATTR_CONTAINER + ']' + 
                '[' + PageStack.ATTR_URL + '="' + PageStack._urlHistory[url] + '"]' +
                ':first'
            );
        }

        // or from the page

        // or at least container to open the hash
        if (!page.length && urlParts[URLPART_HASH]) {
            container = $(
                '[' + PageStack.ATTR_CONTAINER + ']' + 
                '[' + PageStack.ATTR_URL + '="' + encodeURI(urlParts[URLPART_URI]) + '"]' +
                ':first'
            );
        }

        // if everything fails, use global (first) container
        if (!page.length && !container.length) {    
            container = $('[' + PageStack.ATTR_CONTAINER + ']:first');
        }

        console.log('History reopen: ' + url, page, container);

        // open up all parent containers
        parentStack = PageStack.getPageStack(container.parent());
        while (parentStack) {
            var parentPage = parentStack.getPages().has(container);
            if (!parentPage.hasClass(parentStack.options.pageActiveClass)) {
                parentStack.openPage(parentPage, {history : false, reverse : true});
            }
            parentStack = PageStack.getPageStack(parentStack.getContainer().parent());
        }

        // open the page
        parentStack = PageStack.getPageStack(container);
        if (page.length) {
            parentStack.openPage(page, {history : false, reverse : true});
        } else {
            parentStack.openUrl(url, {history : false, reverse : true});
        }

    }

    PageStack.animations.slide = function(page, type, options, next) {
        var width = this.getContainer().innerWidth() + 60,
            left = (type !== 'close' ? 0 : ((options.backward ? 1 : -1) * width))
        ;
        if (type !== 'close') {
            page.css('left', (options.backward ? -1 : 1) * width + 'px');
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

    /** Dont use this animation for anything other than container resize animation */
    PageStack.animations.containerResize = function(page, type, options, next) {
        var activePage = this.getActivePage(),
            height = activePage.outerHeight(),
            minHeight = parseInt(page.css('min-height')) || 0,
            maxHeight = parseInt(page.css('max-height')) || 0;

        if (!height || !activePage.length || activePage.hasClass(this.options.loadingClass)) {
            if (next) next();
            return;
        }
        
        if (minHeight && height < minHeight) height = minHeight;
        if (maxHeight && height > maxHeight) height = maxHeight;
        if (height === parseInt(page.css('height'))) {
            if (next) next();
            return;
        }
        if (options.delay) page.delay(options.delay, options.queue);
        page[options.animateMethod]({
                height : height + 'px'
            }, {
                duration : options.duration, 
                easing   : options.easing, 
                queue    : options.queue,
                complete : next
            });        
    };

    $.fn.pagestack = function(options) {
        if (!options.container) options.container = this;
        new PageStack(options);
    };

    return PageStack;   

})(window, window.jQuery);
