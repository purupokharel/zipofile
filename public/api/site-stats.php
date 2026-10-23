<?php
declare(strict_types=1);
require __DIR__ . "/stats-lib.php";

header("Content-Type: application/json; charset=utf-8");
header("Cache-Control: no-store");
header("X-Content-Type-Options: nosniff");
header("X-Frame-Options: DENY");
header("Referrer-Policy: no-referrer");

if (($_SERVER["REQUEST_METHOD"] ?? "") !== "GET") {
    http_response_code(405);
    echo '{"ok":false}';
    exit;
}

echo json_encode(zipofi_stats_load(), JSON_UNESCAPED_SLASHES);
