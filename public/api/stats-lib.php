<?php
declare(strict_types=1);

function zipofi_stats_defaults(): array
{
    return ["downloads" => 0, "minutesSaved" => 0, "minutesPerDownload" => 15];
}

function zipofi_stats_normalize(array $j): array
{
    $d = zipofi_stats_defaults();
    $d["downloads"] = max(0, (int) ($j["downloads"] ?? $d["downloads"]));
    $d["minutesSaved"] = max(0, (int) ($j["minutesSaved"] ?? $d["minutesSaved"]));
    $d["minutesPerDownload"] = max(0, (int) ($j["minutesPerDownload"] ?? $d["minutesPerDownload"]));
    return $d;
}

function zipofi_stats_path(): string
{
    return __DIR__ . "/data/download-stats.json";
}

function zipofi_stats_legacy_path(): string
{
    return dirname(__DIR__) . "/downloads/stats.json";
}

function zipofi_stats_ensure_dir(): void
{
    $dir = dirname(zipofi_stats_path());
    if (!is_dir($dir)) {
        @mkdir($dir, 0700, true);
    }
}

function zipofi_stats_save(array $sj): bool
{
    zipofi_stats_ensure_dir();
    $path = zipofi_stats_path();
    $fp = @fopen($path, "c+");
    if (!$fp) {
        return false;
    }
    flock($fp, LOCK_EX);
    $out = json_encode(zipofi_stats_normalize($sj), JSON_UNESCAPED_SLASHES);
    rewind($fp);
    ftruncate($fp, 0);
    fwrite($fp, $out);
    fflush($fp);
    flock($fp, LOCK_UN);
    fclose($fp);
    return true;
}

function zipofi_stats_load(): array
{
    $path = zipofi_stats_path();
    if (is_file($path)) {
        $j = json_decode((string) file_get_contents($path), true);
        if (is_array($j)) {
            return zipofi_stats_normalize($j);
        }
    }
    $legacy = zipofi_stats_legacy_path();
    if (is_file($legacy)) {
        $j = json_decode((string) file_get_contents($legacy), true);
        if (is_array($j)) {
            $n = zipofi_stats_normalize($j);
            zipofi_stats_save($n);
            return $n;
        }
    }
    return zipofi_stats_defaults();
}

function zipofi_stats_increment_downloads(): ?array
{
    zipofi_stats_ensure_dir();
    $path = zipofi_stats_path();
    if (!is_file($path)) {
        zipofi_stats_save(zipofi_stats_load());
    }
    $fp = @fopen($path, "c+");
    if (!$fp) {
        return null;
    }
    flock($fp, LOCK_EX);
    $sj = json_decode((string) stream_get_contents($fp), true);
    if (!is_array($sj)) {
        $sj = zipofi_stats_load();
    } else {
        $sj = zipofi_stats_normalize($sj);
    }
    $sj["downloads"] = (int) $sj["downloads"] + 1;
    $out = json_encode($sj, JSON_UNESCAPED_SLASHES);
    rewind($fp);
    ftruncate($fp, 0);
    fwrite($fp, $out);
    fflush($fp);
    flock($fp, LOCK_UN);
    fclose($fp);
    return $sj;
}
