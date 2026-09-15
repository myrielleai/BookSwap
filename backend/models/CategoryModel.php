<?php

/**
 * CategoryModel.php
 * ─────────────────────────────────────────────────────────────────────────────
 * Reference data managed by the Administrator (Phase 1 §3.1.3 and §3.1.6).
 *
 * TABLES:
 *   genres, formats, age_categories → id, name, is_active, created_at
 *   conditions                      → id, label, description, is_active, created_at
 *   meetup_locations                → id, name, address, city, is_active, created_at
 *
 * Nothing here is ever deleted. Entries are retired (is_active = 0) so that
 * listings created under them stay readable.
 * ─────────────────────────────────────────────────────────────────────────────
 */

require_once __DIR__ . '/../config/database.php';
require_once __DIR__ . '/../helpers/response.php';

class CategoryModel {

    private PDO $db;

    // Genres, formats, and age categories share one shape, so one set of
    // methods serves all three. Only these table names can reach the SQL.
    private const TAXONOMY_TABLES = [
        'genre'        => 'genres',
        'format'       => 'formats',
        'age_category' => 'age_categories',
    ];

    public function __construct() {
        $this->db = getDBConnection();
    }

    // ── Genres, Formats, Age Categories ───────────────────────────────────────

    /**
     * Active entries of a taxonomy, alphabetically.
     *
     * @param string $taxonomy 'genre' | 'format' | 'age_category'
     * @return array
     */
    public function listTaxonomy(string $taxonomy): array {
        $table = $this->table($taxonomy);
        return runQuery("SELECT id, name, is_active, created_at FROM $table WHERE is_active = 1 ORDER BY name ASC")->fetchAll();
    }

    /**
     * Find a taxonomy entry, active or retired.
     *
     * @param string $taxonomy
     * @param int    $id
     * @return array|null
     */
    public function findTaxonomy(string $taxonomy, int $id): ?array {
        $table = $this->table($taxonomy);
        return runQuery("SELECT id, name, is_active, created_at FROM $table WHERE id = :id LIMIT 1", [':id' => $id])->fetch() ?: null;
    }

    /**
     * Whether an ID refers to an active entry (used to validate listing fields).
     *
     * @param string $taxonomy
     * @param int    $id
     * @return bool
     */
    public function isActiveTaxonomy(string $taxonomy, int $id): bool {
        $entry = $this->findTaxonomy($taxonomy, $id);
        return $entry !== null && (int) $entry['is_active'] === 1;
    }

    /**
     * Add a taxonomy entry.
     *
     * @param string $taxonomy
     * @param string $name
     * @return int New ID.
     */
    public function createTaxonomy(string $taxonomy, string $name): int {
        $table = $this->table($taxonomy);
        $this->insertUnique(
            "INSERT INTO $table (name, is_active, created_at) VALUES (:name, 1, NOW())",
            [':name' => $name],
            'An entry with that name already exists (it may be retired).'
        );
        return (int) $this->db->lastInsertId();
    }

    /**
     * Retire a taxonomy entry. Listings that use it are unchanged.
     *
     * @param string $taxonomy
     * @param int    $id
     */
    public function retireTaxonomy(string $taxonomy, int $id): void {
        $table = $this->table($taxonomy);
        runQuery("UPDATE $table SET is_active = 0 WHERE id = :id", [':id' => $id]);
    }

    // ── Condition Grades ──────────────────────────────────────────────────────

    /**
     * Active condition grades, in their defined order (best to worst).
     *
     * @return array
     */
    public function getConditions(): array {
        return runQuery("SELECT * FROM conditions WHERE is_active = 1 ORDER BY id ASC")->fetchAll();
    }

    /**
     * @param int $id
     * @return array|null
     */
    public function findCondition(int $id): ?array {
        return runQuery("SELECT * FROM conditions WHERE id = :id LIMIT 1", [':id' => $id])->fetch() ?: null;
    }

    /**
     * @param int $id
     * @return bool
     */
    public function isActiveCondition(int $id): bool {
        $condition = $this->findCondition($id);
        return $condition !== null && (int) $condition['is_active'] === 1;
    }

    /**
     * @param string $label       e.g. "Like New"
     * @param string $description Rubric shown to members when listing.
     * @return int
     */
    public function createCondition(string $label, string $description): int {
        $this->insertUnique(
            "INSERT INTO conditions (label, description, is_active, created_at) VALUES (:label, :description, 1, NOW())",
            [':label' => $label, ':description' => $description],
            'A condition grade with that label already exists (it may be retired).'
        );
        return (int) $this->db->lastInsertId();
    }

    /**
     * @param int $id
     */
    public function retireCondition(int $id): void {
        runQuery("UPDATE conditions SET is_active = 0 WHERE id = :id", [':id' => $id]);
    }

    // ── Meetup Locations ──────────────────────────────────────────────────────

    /**
     * Active meetup locations, alphabetically.
     *
     * @return array
     */
    public function getMeetupLocations(): array {
        return runQuery("SELECT * FROM meetup_locations WHERE is_active = 1 ORDER BY name ASC")->fetchAll();
    }

    /**
     * @param int $id
     * @return array|null
     */
    public function findMeetupLocation(int $id): ?array {
        return runQuery("SELECT * FROM meetup_locations WHERE id = :id LIMIT 1", [':id' => $id])->fetch() ?: null;
    }

    /**
     * @param int $id
     * @return bool
     */
    public function isActiveLocation(int $id): bool {
        $location = $this->findMeetupLocation($id);
        return $location !== null && (int) $location['is_active'] === 1;
    }

    /**
     * @param string $name
     * @param string $address
     * @param string $city
     * @return int
     */
    public function createMeetupLocation(string $name, string $address, string $city): int {
        runQuery(
            "INSERT INTO meetup_locations (name, address, city, is_active, created_at) VALUES (:name, :address, :city, 1, NOW())",
            [':name' => $name, ':address' => $address, ':city' => $city]
        );
        return (int) $this->db->lastInsertId();
    }

    /**
     * Retire a location. Its open future slots stop being offered for scheduling.
     *
     * @param int $id
     */
    public function retireMeetupLocation(int $id): void {
        runQuery("UPDATE meetup_locations SET is_active = 0 WHERE id = :id", [':id' => $id]);
    }

    // ── Internals ─────────────────────────────────────────────────────────────

    /**
     * Map a taxonomy name to its table, refusing anything unknown.
     *
     * @param string $taxonomy
     * @return string
     */
    private function table(string $taxonomy): string {
        if (!isset(self::TAXONOMY_TABLES[$taxonomy])) {
            throw new InvalidArgumentException("Unknown taxonomy: $taxonomy");
        }
        return self::TAXONOMY_TABLES[$taxonomy];
    }

    /**
     * Run an INSERT, turning a duplicate-key error into a 409 response.
     *
     * @param string $sql
     * @param array  $params
     * @param string $duplicateMessage
     */
    private function insertUnique(string $sql, array $params, string $duplicateMessage): void {
        try {
            runQuery($sql, $params);
        } catch (PDOException $e) {
            if (($e->errorInfo[1] ?? null) === 1062) {
                throw new ApiException($duplicateMessage, 409);
            }
            throw $e;
        }
    }
}
