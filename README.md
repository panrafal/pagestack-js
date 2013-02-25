# PAGESTACK 0.1 alpha

Have you ever wanted to do animated, ajax driven website without actually using... ajax? Well, now __you can__!

PageStack allows you to define portions of webpages that can be loaded dynamically and animated. But in fact
these are regular, html webpages. You don't have to generate anything, you don't need models nor views. 
SEO specialists will love you, because every address has it's physical location. Users will love you to, 
because they can use those URLs, or open pages in new tabs without any interference.

PageStack allows to create stacks on many levels, animating just the parts that make sense. And in situations
where it does make sense to generate stuff on the client side (think galleries), PageStack handles this also!


# Prerequisites

**Required**:

* [jQuery](http://jquery.com) It is for now only tested on version 1.9, but should work with
the others.

__Optional dependencies__:

* [jQuery.Address](http://www.asual.com/jquery/address/) For handling history
* [jQuery.transit](https://github.com/panrafal/jquery.transit) For faster, accelerated animations. Because of
the bug in transit, You'll have to use my copy, until the pull request is accepted.

# Usage

Create your pages like you always do. Statically, or with any framework. Just designate parts
that will be controlled by pagestack either by using default css-classes, or by specifiyng your
own in the options.

Create PageStack object and pass it some options. Pagestacks should be created inline for ease of use, especially
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
    <body>
    	<h1>This is the site header. It won't move an inch!</h1>
        <div class="ps-pages">
            <div class="ps-page" title="Hello!">
                <h2>Hello!</h2>
                <a href="/gallery.html">see my gallery!</a>
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
    	<h1>This is the site header. It won't move an inch!</h1>
        <div class="ps-pages">
            <div class="ps-page" title="Gallery">
                <h2>My gallery!</h2>

			    <div id="gallery" class="ps-container">
			        <div class="ps-pages">
			        </div>
			        <span style="display:none">
			        	<!-- we need them for prev/next to work, but we don't want to show them -->
			        	<a href="#image1.jpg"></a>
			        	<a href="#image2.jpg"></a>
			        	<a href="#image3.jpg"></a>
			        </span>
			        <a href="#" class="ps-prev">prev</a>
			        <a href="#" class="ps-next">next</a>
			    </div>

			    <script>
			    	// we have to initialize gallery container
			    	initMyGallery();
			    </script>
                <a href="/test/index.html" class="ps-close">go back</a>
            </div>
        </div>

    </body>
</html>
```

### mypage.js
```js
$(function() {
    $.address.state('/');
    $('body').pagestack({
    	// you can customize the pagestack here

    	// use fade animation
    	animation : { all : {animation : 'fade'} }
    });
});

initMyGallery() {
	// another way to use PageStack
    new PageStack({
        container: '.ps-container',
        history: false, // we dont need history here
        pagesLimit: -1, // we want to keep all generated pages for fast traversing
        initialUrl: '#image1.jpg', // we want to start with first image
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
    position:absolute;
    width:100%;
    display:none;
}
.ps-page.ps-active, .ps-page.ps-animate {
    display:block; /* show only active and animated */
}

```