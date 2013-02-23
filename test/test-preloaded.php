<?php
$title = explode('-', $title);

foreach($title as $part) {
    ?>
    <div class="ps-page" id="<?= htmlspecialchars($part) ?>">
        <h1><?= htmlspecialchars($part) ?></h1>
    </div>
    <?php
}
