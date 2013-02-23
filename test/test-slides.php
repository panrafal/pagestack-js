<div class="ps-page">
    <div id="slides">
        <div class="ps-pages">
            <div class="ps-page slide" 
                data-ps-onready="console.log('ready!', this, page, options)"
                data-ps-onopen="console.log('open!', this, page, options)"
                data-ps-onopened="console.log('opened!', this, page, options)"
                data-ps-onclose="console.log('close!', this, page, options)"
                data-ps-onclosed="console.log('closed!', this, page, options)"
                >
                <h2><?= htmlspecialchars($title) ?></h2>
                Slide
                <a href="/test/slides-start.html" class="ps-close">close</a>
                <script>
                    console.log('Slide: <?= htmlspecialchars($title) ?>');
                </script>                
            </div>
        </div>
        <?php 
        for ($i = 1; $i < 10; ++$i) echo '<a href="/test/slides-',$i,'.html">',$i,'</a>';
        ?>
    </div>

    <script>
        new PageStack({
            container: '#slides',
            showLoadingPage: true
        });
        console.log('Slides initialized');
    </script>
</div>