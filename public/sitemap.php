<?php
/**
 * Hostinger / Apache dynamic sitemap proxy.
 *
 * Serves XML from Supabase (refreshed when an article is saved in the admin CMS).
 * public/.htaccess rewrites /sitemap.xml → this script.
 *
 * Setup: copy sitemap-config.sample.php → sitemap-config.php and fill Supabase values,
 * or set SUPABASE_URL / SUPABASE_ANON_KEY in the hosting environment.
 */

header('Content-Type: application/xml; charset=UTF-8');
header('Cache-Control: public, max-age=0, must-revalidate');

$configFile = __DIR__ . '/sitemap-config.php';
$cfg = is_file($configFile) ? require $configFile : [];

$supabaseUrl = rtrim(getenv('SUPABASE_URL') ?: ($cfg['supabase_url'] ?? ''), '/');
$anonKey = getenv('SUPABASE_ANON_KEY') ?: ($cfg['supabase_anon_key'] ?? '');
$siteBase = rtrim(getenv('SITE_BASE_URL') ?: ($cfg['site_base_url'] ?? 'https://www.autodevisexpert.com'), '/');

function fetch_setting(string $url, string $key, string $anonKey): ?string {
  $endpoint = $url . '/rest/v1/app_settings?key=eq.' . rawurlencode($key) . '&select=value';
  $ch = curl_init($endpoint);
  curl_setopt_array($ch, [
    CURLOPT_RETURNTRANSFER => true,
    CURLOPT_HTTPHEADER => [
      'apikey: ' . $anonKey,
      'Authorization: Bearer ' . $anonKey,
      'Accept: application/json',
    ],
    CURLOPT_TIMEOUT => 8,
  ]);
  $response = curl_exec($ch);
  $status = (int) curl_getinfo($ch, CURLINFO_HTTP_CODE);
  curl_close($ch);

  if ($response === false || $status < 200 || $status >= 300) {
    return null;
  }

  $rows = json_decode($response, true);
  if (!is_array($rows) || empty($rows[0]['value'])) {
    return null;
  }

  return (string) $rows[0]['value'];
}

function escape_xml(string $value): string {
  return htmlspecialchars($value, ENT_XML1 | ENT_QUOTES, 'UTF-8');
}

function fetch_json(string $endpoint, string $anonKey): ?array {
  $ch = curl_init($endpoint);
  curl_setopt_array($ch, [
    CURLOPT_RETURNTRANSFER => true,
    CURLOPT_HTTPHEADER => [
      'apikey: ' . $anonKey,
      'Authorization: Bearer ' . $anonKey,
      'Accept: application/json',
    ],
    CURLOPT_TIMEOUT => 8,
  ]);
  $response = curl_exec($ch);
  $status = (int) curl_getinfo($ch, CURLINFO_HTTP_CODE);
  curl_close($ch);

  if ($response === false || $status < 200 || $status >= 300) {
    return null;
  }

  $decoded = json_decode($response, true);
  return is_array($decoded) ? $decoded : null;
}

function build_sitemap_xml(string $siteBase, array $articles, array $reports = []): string {
  $today = gmdate('Y-m-d');
  $static = [
    ['/', '1.0', 'weekly'],
    ['/blog', '0.8', 'weekly'],
    ['/contact', '0.5', 'monthly'],
    ['/mentions-legales', '0.3', 'yearly'],
    ['/politique-de-confidentialite', '0.3', 'yearly'],
    ['/cgu', '0.3', 'yearly'],
  ];

  $entries = '';
  foreach ($static as [$path, $priority, $freq]) {
    $loc = $siteBase . ($path === '/' ? '/' : $path);
    $entries .= "  <url>\n";
    $entries .= '    <loc>' . escape_xml($loc) . "</loc>\n";
    $entries .= '    <lastmod>' . escape_xml($today) . "</lastmod>\n";
    $entries .= '    <changefreq>' . escape_xml($freq) . "</changefreq>\n";
    $entries .= '    <priority>' . escape_xml($priority) . "</priority>\n";
    $entries .= "  </url>\n";
  }

  foreach ($articles as $article) {
    if (empty($article['slug'])) {
      continue;
    }
    $lastmod = !empty($article['date']) ? (string) $article['date'] : $today;
    $entries .= "  <url>\n";
    $entries .= '    <loc>' . escape_xml($siteBase . '/blog/' . $article['slug']) . "</loc>\n";
    $entries .= '    <lastmod>' . escape_xml($lastmod) . "</lastmod>\n";
    $entries .= "    <changefreq>monthly</changefreq>\n";
    $entries .= "    <priority>0.7</priority>\n";
    $entries .= "  </url>\n";
  }

  foreach ($reports as $report) {
    $pathSlug = $report['path_slug'] ?? $report['pathSlug'] ?? '';
    if ($pathSlug === '') {
      continue;
    }
    $lastmod = !empty($report['created_at'])
      ? substr((string) $report['created_at'], 0, 10)
      : (!empty($report['date']) ? (string) $report['date'] : $today);
    $entries .= "  <url>\n";
    $entries .= '    <loc>' . escape_xml($siteBase . '/devis-analyses/' . $pathSlug) . "</loc>\n";
    $entries .= '    <lastmod>' . escape_xml($lastmod) . "</lastmod>\n";
    $entries .= "    <changefreq>weekly</changefreq>\n";
    $entries .= "    <priority>0.6</priority>\n";
    $entries .= "  </url>\n";
  }

  return "<?xml version=\"1.0\" encoding=\"UTF-8\"?>\n"
    . "<urlset xmlns=\"http://www.sitemaps.org/schemas/sitemap/0.9\">\n"
    . $entries
    . "</urlset>\n";
}

function serve_fallback(): void {
  $fallback = __DIR__ . '/sitemap.fallback.xml';
  if (is_file($fallback)) {
    readfile($fallback);
    exit;
  }
  http_response_code(503);
  echo '<?xml version="1.0" encoding="UTF-8"?><error>Sitemap unavailable</error>';
  exit;
}

if ($supabaseUrl === '' || $anonKey === '') {
  serve_fallback();
}

// Always rebuild from live blog_articles — never serve a stale sitemap_xml cache.
$blogJson = fetch_setting($supabaseUrl, 'blog_articles', $anonKey);
$articles = $blogJson !== null ? json_decode($blogJson, true) : [];
if (!is_array($articles)) {
  $articles = [];
}

$reports = fetch_json(
  $supabaseUrl . '/rest/v1/quote_reports?published=eq.true&select=path_slug,created_at&order=created_at.desc&limit=500',
  $anonKey
) ?? [];

if (count($articles) > 0 || count($reports) > 0) {
  echo build_sitemap_xml($siteBase, $articles, $reports);
  exit;
}

serve_fallback();
