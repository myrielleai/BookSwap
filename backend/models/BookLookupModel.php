<?php

/**
 * BookLookupModel.php
 * ─────────────────────────────────────────────────────────────────────────────
 * Book details by ISBN from the Open Library Search API, so a member listing a
 * book can fill in the title, author, and publisher from its ISBN.
 *
 * Open Library retired its old "api/books?bibkeys=...&jscmd=data" endpoint
 * (it now answers 404), so lookups go through search.json?q=isbn:{isbn}
 * instead, asking only for the fields shape() needs. A doc can surface from a
 * fuzzy match, so the result is discarded unless our ISBN is actually in its
 * isbn list.
 *
 * Answers are cached in book_lookup_cache: found books for
 * BOOK_CACHE_FOUND_DAYS, unknown ISBNs for BOOK_CACHE_MISSING_DAYS. Errors from
 * Open Library are never cached, so the next attempt tries again.
 *
 * TABLE: book_lookup_cache
 *   isbn, found, payload (JSON), fetched_at, expires_at
 * ─────────────────────────────────────────────────────────────────────────────
 */

require_once __DIR__ . '/../config/database.php';
require_once __DIR__ . '/../config/constants.php';
require_once __DIR__ . '/../helpers/http.php';
require_once __DIR__ . '/../helpers/response.php';

class BookLookupModel {

    /**
     * Look up a book.
     *
     * @param string $isbn Output of normalizeIsbn().
     * @return array Keys: found (bool), book (array|null), cached (bool).
     * @throws ApiException 502 when Open Library cannot be reached or answers with an error.
     */
    public function lookup(string $isbn): array {
        $row = runQuery(
            "SELECT found, payload FROM book_lookup_cache WHERE isbn = :isbn AND expires_at > NOW()",
            [':isbn' => $isbn]
        )->fetch();

        if ($row) {
            $book = (int) $row['found'] === 1 ? json_decode((string) $row['payload'], true) : null;
            return ['found' => is_array($book), 'book' => is_array($book) ? $book : null, 'cached' => true];
        }

        $url = rtrim(OPEN_LIBRARY_BASE_URL, '/') . '/search.json?' . http_build_query([
            'q'      => "isbn:$isbn",
            'fields' => 'title,author_name,publisher,first_publish_year,number_of_pages_median,cover_i,subject,isbn,key',
            'limit'  => 1,
        ]);
        $response = httpRequest('GET', $url, ['Accept: application/json'], null, 8);
        $data     = $response['status'] === 200 ? json_decode($response['body'], true) : null;

        if (!is_array($data) || !is_array($data['docs'] ?? null)) {
            error_log('[BookSwap Open Library] HTTP ' . $response['status'] . ' ' . ($response['error'] ?? ''));
            throw new ApiException('The book lookup service is unavailable right now. You can still enter the details manually.', 502);
        }

        // A search can surface a fuzzy match, so only trust a doc that
        // actually lists our ISBN among its editions.
        $entry = $data['docs'][0] ?? null;
        $entry = is_array($entry) && in_array($isbn, $entry['isbn'] ?? [], true) ? $entry : null;
        $book  = $entry !== null ? $this->shape($isbn, $entry) : null;

        // REPLACE INTO (not "INSERT ... ON DUPLICATE KEY UPDATE") and a
        // PHP-computed expiry (not "NOW() + INTERVAL :days DAY") so this
        // query runs unchanged on both MySQL and the SQLite dev fallback.
        $days = $book !== null ? BOOK_CACHE_FOUND_DAYS : BOOK_CACHE_MISSING_DAYS;
        runQuery("
            REPLACE INTO book_lookup_cache (isbn, found, payload, fetched_at, expires_at)
            VALUES (:isbn, :found, :payload, NOW(), :expires_at)
        ", [
            ':isbn'        => $isbn,
            ':found'       => $book !== null ? 1 : 0,
            ':payload'     => $book !== null ? json_encode($book, JSON_UNESCAPED_SLASHES | JSON_UNESCAPED_UNICODE) : null,
            ':expires_at'  => date('Y-m-d H:i:s', time() + $days * 86400),
        ]);

        return ['found' => $book !== null, 'book' => $book, 'cached' => false];
    }

    /**
     * Keep only the fields a listing form needs, with predictable types.
     *
     * @param string $isbn
     * @param array  $entry One doc from Open Library's search.json response.
     * @return array
     */
    private function shape(string $isbn, array $entry): array {
        $text = fn($value): ?string => is_string($value) && trim($value) !== '' ? trim($value) : null;

        $strings = function ($list, int $limit): array {
            $out = [];
            foreach (is_array($list) ? $list : [] as $item) {
                if (is_string($item) && trim($item) !== '' && !in_array(trim($item), $out, true)) {
                    $out[] = trim($item);
                }
                if (count($out) === $limit) {
                    break;
                }
            }
            return $out;
        };

        $authors  = $strings($entry['author_name'] ?? null, 10);
        $coverId  = $entry['cover_i'] ?? null;
        $workKey  = $text($entry['key'] ?? null);

        return [
            'isbn'             => $isbn,
            'title'            => $text($entry['title'] ?? null) ?? '',
            'authors'          => $authors,
            'author'           => implode(', ', $authors),
            'publisher'        => $strings($entry['publisher'] ?? null, 1)[0] ?? null,
            'publish_date'     => isset($entry['first_publish_year']) ? (string) $entry['first_publish_year'] : null,
            'pages'            => is_numeric($entry['number_of_pages_median'] ?? null) ? (int) round($entry['number_of_pages_median']) : null,
            'cover_url'        => is_int($coverId) ? "https://covers.openlibrary.org/b/id/$coverId-L.jpg" : null,
            'subjects'         => $strings($entry['subject'] ?? null, 10),
            'open_library_url' => $workKey !== null ? 'https://openlibrary.org' . $workKey : null,
        ];
    }
}
