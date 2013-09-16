# PAGESTACK 0.1 alpha

Have you ever wanted to do animated, ajax driven website without actually using... ajax? Well, now __you can__!

PageStack allows you to define portions of webpages that can be loaded dynamically and animated. But in fact
these are regular, html webpages. You don't have to generate anything, you don't need models nor views. 
SEO specialists will love you, because every address has it's physical location. Users will love you to, 
because they can use those URLs, or open pages in new tabs without any interference.

PageStack allows to create stacks on many levels, animating just specific parts. And in situations
where it does make sense to generate stuff on the client side (think galleries), PageStack handles this also!

There is one caveat though - the whole 'pagestacked' website should use a common set of css styles and js scripts. So that every loaded page fragment has all required scripts and styles ready. Otherwise you have to employ conditional loading, load some parts of the website traditional way or use iframes.

## Showcase

[ZloteTarasy.pl](http://www.zlotetarasy.pl/) - with up to 4 levels of stacks! Responsive, SEO friendly, animated.

## Prerequisites

**Required**:

* [jQuery](http://jquery.com) developed on version 1.9, but should work with the older ones...

__Optional dependencies__:

* [jQuery.Address](http://www.asual.com/jquery/address/) For history handling
* [jQuery.transit](https://github.com/panrafal/jquery.transit) For faster, accelerated animations. Because of
the bug in transit, You'll have to use my copy, until the pull request is accepted.

## Usage

Create your pages like you always do. Statically, or with any framework. Just designate parts
that will be controlled by pagestack either by using default css-classes, or by specifiyng your
own in the options.

Create PageStack object and pass it some options. Pagestacks should be initialized inline for ease of use, especially
the embedded ones. You can make it fully event-driven, but it's not covered here.

Minimal website with an index page and a dynamic gallery:

### index.html:
```html
<!DOCTYPE html>
<html>
    <head>
        <script src="http://code.jquery.com/jquery-1.9.0.js"></script>
        <script src="vendor/jquery.transit.js"></script>
        <script src="vendor/jquery.address.js"></script>
        <script src="vendor/pagestack.js"></script>
        <script src="mypage.js"></script>
        <link rel="stylesheet" type="text/css" href="mypage.css" />
    </head>
    <body> <!-- This will be the "container" -->
        <h1>This is the site header. It won't move an inch!</h1>
        <div class="ps-pages"> <!-- Pages will be loaded in here -->
            <div class="ps-page" title="Hello!"> <!-- This is the index page -->
                <h2>Hello!</h2>
                <!-- The page below will be loaded. 
                     The page will be extracted with 'body .ps-page' selector.
                     The page will be appended to ps-pages and animated.-->
                <a href="gallery.html">see my gallery!</a> 
            </div>
        </div>

    </body>
</html>
```

### gallery.html
```html
<!DOCTYPE html>
<html>
    <head>
        <script src="http://code.jquery.com/jquery-1.9.0.js"></script>
        <script src="vendor/jquery.transit.js"></script>
        <script src="vendor/jquery.address.js"></script>
        <script src="vendor/pagestack.js"></script>
        <script src="mypage.js"></script>
        <link rel="stylesheet" type="text/css" href="mypage.css" />
    </head>
    <body> 
        <!-- Everything except the page content should be the same. 
             If the user navigates to this url directly, and open index.html
             from here, he should see the same page, as he would go to index.html directly.
        -->
        <h1>This is the site header. It won't move an inch!</h1>
        <div class="ps-pages">
            <div class="ps-page" title="Gallery"> <!-- This is the gallery page -->
                <h2>My gallery!</h2>
                <!-- Gallery is an embedded container. 
                     Because of that, both the id AND a class are required.
                     ID is used to locate the container when loading the page fragment.
                     Css class is used to reference the container in PageStack options,
                     where referencing by id should be avoided. -->
                <div id="gallery" class="ps-container">
                     <div class="ps-pages">
                           <!-- the contents will go here, dynamically -->
                    </div>
                    <span style="display:none">
                        <!-- These links are the reference for prev and next buttons.
                             You could make a list of thumbnails - an active one will
                             have a 'active' class. -->
                        <a href="#image1.jpg"></a>
                        <a href="#image2.jpg"></a>
                        <a href="#image3.jpg"></a>
                    </span>
                    <!-- ps-prev and ps-prev are special classes. They will open
                         previous/next navigation link -->
                    <a href="#" class="ps-prev">prev</a>
                    <a href="#" class="ps-next">next</a>
                </div>
                <!-- ps-close will close the current page and open the previous one.
                     If there are no other pages, the href will be used instead -->
                <a href="/test/index.html" class="ps-close">go back</a>
                <script>
                    // we have to initialize gallery container
                    initMyGallery();
                </script>
            </div>
        </div>

    </body>
</html>
```

### mypage.js
```js
// initialize main container
$(function() {
    // setup jquery.address history
    $.address.state('/');
    // make body a PageStack container
    $('body').pagestack({
        // you can customize the pagestack here

        // use fade animation 
        animation : { all : {motion : 'fade'} }
    });
});

initMyGallery() {
    // another way to use PageStack
    new PageStack({
        container: '.ps-container',
        history: false, // we don't need history here
        pagesLimit: -1, // we want to keep all generated pages for fast traversing
        initialUrl: '#image1.jpg', // we want to start with the first image
        /** content provider returns page's contents. 
            Enclosing in <div class="ps-page"></div> is optional. */
        contentProvider: function(url, options) {
            return '<img src="' + options.urlHash + '" />';
        }
    }); 
}
```

### mypage.css
```css
.ps-pages {
    position:relative;
}
.ps-page {
    /* There may be many pages under .ps-pages - hence the absolute positioning.
       All inactive ones should be hidden. 
       */
    position:absolute;
    width:100%;
    display:none;
}
.ps-page.ps-active, .ps-page.ps-animate {
    display:block;
}
.ps-page.ps-active.ps-animate-wait {
    /* when the page waits for it's open animation it's already active
       we need to hide it */
    display:none;
}

```

## API

You can find all available methods and options in the annotated source code.
