<?php

/**
 * BookController.php
 * ─────────────────────────────────────────────────────────────────────────────
 * Book details by ISBN (Open Library Books API), to pre-fill the listing form.
 *
 * Endpoints (defined in routes/api.php):
 *   GET /api/books/lookup?isbn=  → lookup()
 * ─────────────────────────────────────────────────────────────────────────────
 */

require_once __DIR__ . '/../middleware/auth_middleware.php';
require_once __DIR__ . '/../models/BookLookupModel.php';
require_once __DIR__ . '/../models/CategoryModel.php';
require_once __DIR__ . '/../helpers/isbn.php';
require_once __DIR__ . '/../helpers/response.php';
require_once __DIR__ . '/../config/constants.php';

class BookController {

    // Words in Open Library subjects that point to a BookSwap genre (matched by genre name).
    private const GENRE_KEYWORDS = [
        'Fantasy'            => ['fantasy', 'magic', 'wizards', 'dragons'],
        'Science Fiction'    => ['science fiction', 'sci-fi', 'space', 'dystopia', 'robots'],
        'Mystery & Thriller' => ['mystery', 'thriller', 'detective', 'crime', 'suspense'],
        'Romance'            => ['romance', 'love stories'],
        'Non-fiction'        => ['biography', 'history', 'science', 'self-help', 'nonfiction', 'non-fiction'],
        'Classics'           => ['classic', 'classics'],
    ];

    private BookLookupModel $bookLookupModel;
    private CategoryModel   $categoryModel;

    public function __construct() {
        $this->bookLookupModel = new BookLookupModel();
        $this->categoryModel   = new CategoryModel();
    }

    /**
     * GET /api/books/lookup?isbn=9780441013593
     *
     * Signed-in members only, so the endpoint cannot be used as a free proxy.
     * Returns the book details plus a suggested genre from the active genres.
     */
    public function lookup(): void {
        requireAuth();

        $raw  = $_GET['isbn'] ?? '';
        $isbn = is_string($raw) ? normalizeIsbn($raw) : null;
        if ($isbn === null) {
            sendError('Validation failed.', 422, ['isbn' => 'isbn must be a valid ISBN-10 or ISBN-13.']);
        }

        $result = $this->bookLookupModel->lookup($isbn);
        if (!$result['found']) {
            sendNotFound('No book was found for that ISBN. You can still enter the details manually.');
        }

        $book = $result['book'];
        $book['suggested_genre'] = $this->suggestGenre($book['subjects']);
        $book['cached']          = $result['cached'];
        $book['source']          = 'Open Library';

        sendSuccess($book, 'Book details found.');
    }

    /**
     * The active genre whose keyword best matches the book's subjects.
     *
     * Keywords match whole words, and the longest match wins, so a subject of
     * "Science fiction" suggests Science Fiction rather than Non-fiction
     * (whose keywords include "science").
     *
     * @param string[] $subjects
     * @return array|null Keys: id, name.
     */
    private function suggestGenre(array $subjects): ?array {
        $haystack = mb_strtolower(implode(' | ', $subjects));
        if ($haystack === '') {
            return null;
        }

        $best      = null;
        $bestScore = 0;
        foreach ($this->categoryModel->listTaxonomy('genre') as $genre) {
            foreach (self::GENRE_KEYWORDS[$genre['name']] ?? [mb_strtolower($genre['name'])] as $keyword) {
                $pattern = '/(?<![\p{L}\p{N}])' . preg_quote($keyword, '/') . '(?![\p{L}\p{N}])/u';
                if (mb_strlen($keyword) > $bestScore && preg_match($pattern, $haystack)) {
                    $best      = ['id' => (int) $genre['id'], 'name' => $genre['name']];
                    $bestScore = mb_strlen($keyword);
                }
            }
        }
        return $best;
    }
}
