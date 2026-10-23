<?php
declare(strict_types=1);
require __DIR__ . "/stats-lib.php";
header("Content-Type: application/json; charset=utf-8");
header("Cache-Control: no-store");
header("X-Content-Type-Options: nosniff");
header("X-Frame-Options: DENY");
header("Referrer-Policy: no-referrer");

$method = $_SERVER["REQUEST_METHOD"] ?? "";
if ($method === "OPTIONS") {
    http_response_code(204);
    exit;
}
if ($method !== "POST") {
    http_response_code(405);
    echo '{"ok":false}';
    exit;
}
if (($_SERVER["HTTP_X_ZIPOFILE_DOWNLOAD"] ?? "") !== "1") {
    http_response_code(403);
    echo '{"ok":false}';
    exit;
}

$okHosts = ["zipofile.com", "www.zipofile.com", "127.0.0.1", "localhost"];
$host = strtolower((string) preg_replace("/:\\d+$/", "", $_SERVER["HTTP_HOST"] ?? ""));
$origin = $_SERVER["HTTP_ORIGIN"] ?? "";
if ($origin !== "") {
    $oh = strtolower((string) parse_url($origin, PHP_URL_HOST));
    $os = (string) parse_url($origin, PHP_URL_SCHEME);
    $ok = ($os === "https" && in_array($oh, ["zipofile.com", "www.zipofile.com"], true))
        || (in_array($oh, ["127.0.0.1", "localhost"], true) && in_array($os, ["http", "https"], true));
    if (!$ok) {
        http_response_code(403);
        echo '{"ok":false}';
        exit;
    }
} elseif (!in_array($host, $okHosts, true)) {
    http_response_code(403);
    echo '{"ok":false}';
    exit;
}

$ip = preg_replace("/[^0-9a-fA-F:.]/", "", (string) ($_SERVER["REMOTE_ADDR"] ?? "0")) ?: "0";
$dir = __DIR__ . "/.rate";
if (!is_dir($dir)) {
    @mkdir($dir, 0700);
}
$file = $dir . "/" . hash("sha256", $ip) . ".json";
$now = time();
$win = 3600;
$max = 8;
$fp = @fopen($file, "c+");
if (!$fp) {
    http_response_code(503);
    echo '{"ok":false}';
    exit;
}
flock($fp, LOCK_EX);
$raw = stream_get_contents($fp);
$state = json_decode($raw ?: "", true);
if (!is_array($state) || !isset($state["t"], $state["n"])) {
    $state = ["t" => $now, "n" => 0];
}
if ($now - (int) $state["t"] > $win) {
    $state = ["t" => $now, "n" => 0];
}
if ((int) $state["n"] >= $max) {
    flock($fp, LOCK_UN);
    fclose($fp);
    http_response_code(429);
    echo '{"ok":false}';
    exit;
}
$state["n"] = (int) $state["n"] + 1;
rewind($fp);
ftruncate($fp, 0);
fwrite($fp, json_encode($state));
fflush($fp);
flock($fp, LOCK_UN);
fclose($fp);

if (zipofi_stats_increment_downloads() === null) {
    http_response_code(503);
    echo '{"ok":false}';
    exit;
}
echo '{"ok":true}';
