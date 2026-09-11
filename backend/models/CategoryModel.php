<?php

/**
 * CategoryModel.php
 * ─────────────────────────────────────────────────────────────────────────────
 * All database operations for taxonomy tables managed by the Administrator.
 *
 * TABLES ASSUMED:
 *   categories     → id, name, type ('genre'|'age'|'format'), is_active, created_at
 *   conditions     → id, label ('Like New'|'Good'|'Fair'|'Heavily Used'), description, is_active
 *   meetup_locations → id, name, address, is_active
 * ─────────────────────────────────────────────────────────────────────────────
 */

require_once __DIR__ . '/../config/database.php';

class CategoryModel {

    private ?PDO $db;

    public function __construct() {
        $this->db = getDBConnection();
    }

    // ── Categories (Genres / Age Groups / Formats) ────────────────────────────

    /**
     * Get all active categories, optionally filtered by type.
     *
     * @param string|null $type 'genre' | 'age' | 'format' | null (all)
     * @return array
     */
    public function getCategories(?string $type = null): array {
        // TODO (DB):
        // $where  = ["is_active = 1"];
        // $params = [];
        // if ($type) { $where[] = "type = :type"; $params[':type'] = $type; }
        // $sql = "SELECT * FROM categories WHERE " . implode(' AND ', $where) . " ORDER BY name ASC";
        // $stmt = $this->db->prepare($sql);
        // $stmt->execute($params);
        // return $stmt->fetchAll();

        return []; // stub
    }

    /**
     * Create a new category.
     *
     * @param string $name
     * @param string $type 'genre' | 'age' | 'format'
     * @return int  New category's ID.
     */
    public function createCategory(string $name, string $type): int {
        // TODO (DB):
        // SQL: INSERT INTO categories (name, type, is_active, created_at) VALUES (:name, :type, 1, NOW())
        //
        // $stmt = $this->db->prepare("INSERT INTO categories (name, type, is_active, created_at) VALUES (:name, :type, 1, NOW())");
        // $stmt->execute([':name' => $name, ':type' => $type]);
        // return (int) $this->db->lastInsertId();

        return 0; // stub
    }

    /**
     * Retire a category by marking it inactive.
     * Historical listings referencing it are not changed.
     *
     * @param int $id
     * @return bool
     */
    public function retireCategory(int $id): bool {
        // TODO (DB):
        // SQL: UPDATE categories SET is_active = 0 WHERE id = :id
        //
        // $stmt = $this->db->prepare("UPDATE categories SET is_active = 0 WHERE id = :id");
        // return $stmt->execute([':id' => $id]);

        return false; // stub
    }

    // ── Condition Grades ──────────────────────────────────────────────────────

    /**
     * Get all active condition grades (shown to users at listing time).
     *
     * @return array
     */
    public function getConditions(): array {
        // TODO (DB):
        // SQL: SELECT * FROM conditions WHERE is_active = 1 ORDER BY id ASC
        //
        // $stmt = $this->db->prepare("SELECT * FROM conditions WHERE is_active = 1 ORDER BY id ASC");
        // $stmt->execute();
        // return $stmt->fetchAll();

        return []; // stub
    }

    /**
     * Create a new condition grade.
     *
     * @param string $label       Display label, e.g., "Like New".
     * @param string $description Written description shown to users.
     * @return int
     */
    public function createCondition(string $label, string $description): int {
        // TODO (DB):
        // SQL: INSERT INTO conditions (label, description, is_active, created_at)
        //      VALUES (:label, :description, 1, NOW())
        //
        // $stmt = $this->db->prepare("...");
        // $stmt->execute([':label' => $label, ':description' => $description]);
        // return (int) $this->db->lastInsertId();

        return 0; // stub
    }

    /**
     * Retire a condition grade (mark inactive).
     *
     * @param int $id
     * @return bool
     */
    public function retireCondition(int $id): bool {
        // TODO (DB):
        // SQL: UPDATE conditions SET is_active = 0 WHERE id = :id
        //
        // $stmt = $this->db->prepare("UPDATE conditions SET is_active = 0 WHERE id = :id");
        // return $stmt->execute([':id' => $id]);

        return false; // stub
    }

    // ── Meetup Locations ──────────────────────────────────────────────────────

    /**
     * Get all active meetup locations (shown to Staff when scheduling handovers).
     *
     * @return array
     */
    public function getMeetupLocations(): array {
        // TODO (DB):
        // SQL: SELECT * FROM meetup_locations WHERE is_active = 1 ORDER BY name ASC
        //
        // $stmt = $this->db->prepare("SELECT * FROM meetup_locations WHERE is_active = 1 ORDER BY name ASC");
        // $stmt->execute();
        // return $stmt->fetchAll();

        return []; // stub
    }

    /**
     * Add a new meetup location.
     *
     * @param string $name
     * @param string $address
     * @return int
     */
    public function createMeetupLocation(string $name, string $address): int {
        // TODO (DB):
        // SQL: INSERT INTO meetup_locations (name, address, is_active, created_at)
        //      VALUES (:name, :address, 1, NOW())
        //
        // $stmt = $this->db->prepare("...");
        // $stmt->execute([':name' => $name, ':address' => $address]);
        // return (int) $this->db->lastInsertId();

        return 0; // stub
    }

    /**
     * Retire a meetup location (mark inactive).
     *
     * @param int $id
     * @return bool
     */
    public function retireMeetupLocation(int $id): bool {
        // TODO (DB):
        // SQL: UPDATE meetup_locations SET is_active = 0 WHERE id = :id
        //
        // $stmt = $this->db->prepare("UPDATE meetup_locations SET is_active = 0 WHERE id = :id");
        // return $stmt->execute([':id' => $id]);

        return false; // stub
    }
}
