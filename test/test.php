<?php 
$match = array();
if (preg_match('~((?:vendor/)?[-_.a-z0-9]+\.js)$~', $_SERVER['REQUEST_URI'], $match)) {
    header('Content-type: text/javascript');
    readfile(__DIR__ . '/../' . $match[1]);
    return;
} elseif (preg_match('~\.css~', $_SERVER['REQUEST_URI'])) {
    header('Content-type: text/css');
    readfile(__DIR__ . '/' . basename($_SERVER['REQUEST_URI']));
    return;
}
$template = false;
$title = 'unknown :(';
if (preg_match('~(?:([_0-9a-z]+)-)?([^/]+)\.html$~', $_SERVER['REQUEST_URI'], $tab)) {
    $template = $tab[1];
    $title = $tab[2];
} else {
    header('HTTP/1.1 404');
}
?>
<!DOCTYPE html>
<html>
    <head>
        <script src="http://code.jquery.com/jquery-1.9.0.js"></script>
        <script src="http://code.jquery.com/jquery-migrate-1.0.0.js"></script>
        <script src="/vendor/jquery.transit.js"></script>
        <script src="/vendor/jquery.address.js"></script>
        <script src="/pagestack.js"></script>
        <link rel="stylesheet" type="text/css" href="/test/test.css" />
    </head>
    <body>
        <div class="ps-nav">
            <ul>
                <li><a href="/test/index.html">[I] Index</a></li>
                <li><a href="/test/foobar.html">[I] Foobar</a></li>
                <li><a href="/test/hello_world.html">[I] Hello world</a></li>
                <li><a href="/test/preloaded-foo-bar-baz.html">[I Preloaded] Foo Bar Baz </a>
                    , <a href="/test/preloaded-foo-bar-baz.html#foo">/Foo </a>
                    , <a href="/test/preloaded-foo-bar-baz.html#bar">/Bar </a>
                    , <a href="#foo">#foo </a>
                    , <a href="#bar">#bar </a>
                </li>
                <li><a href="/test/slides-start.html">[II Slides] Start </a></li>
                <li><a href="/test/dynamic-1.html">[II Dynamic] Start </a>,
                    <a href="/test/dynamic-1.html#Foo">/#Foo </a>,
                    <a href="/test/dynamic-1.html#Bar">/#Bar </a>,
                </li>
            </ul>
        </div>
        <div class="ps-pages">
            <?php 
            if ($template) {
                require(__DIR__ . '/test-' . basename($template) . '.php');
            } else {
                ?>
                <div class="ps-page" title="<?= htmlspecialchars($title) ?>">
                    <h1><?= htmlspecialchars($title) ?></h1>
                    <a href="/test/index.html" class="ps-close">close</a>
                </div>
                <?php
            }
            ?>
        </div>

        <script>
            $.address.state('/');
            var pagestack = new PageStack({
                navParentSelector : '.ps-nav>ul>li',
                pagesLimit : -1,
                //showLoadingPage : false,
                animation : { all : {animation : 'fade'} }
            });
        </script>
    </body>
</html>