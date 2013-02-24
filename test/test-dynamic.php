<div class="ps-page">
    <div id="dynamic" class="ps-container">
        <div class="ps-pages">
        </div>
        <?php 
        foreach (array('Foo', 'Bar', 'Baz', 'Hello!', 'Double#Hash', 'Wait') as $i) echo '<a href="#',$i,'">',$i,'</a> ';
        ?>
        <a href="#" class="ps-prev">prev</a>
        <a href="#" class="ps-next">next</a>
    </div>


    <script>
        new PageStack({
            container: '.ps-container',
            showLoadingPage: true,
            pagesLimit: -1,
            initialUrl: '#Wait',
            contentProvider: function(url, options) {
                var html = '<h2>' + options.urlHash + '</h2> <a href="#Foo" class="ps-close">close</a>';
                if (options.urlHash === 'Wait') {
                    var deferred = jQuery.Deferred();
                    setTimeout(function() {
                        deferred.resolve(html);
                    }, 1000);
                    return deferred;
                } else {
                    return html;
                }
            }
        });
        console.log('Dynamic initialized');
    </script>
</div>