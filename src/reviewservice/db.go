// Copyright 2024 Google LLC
//
// Licensed under the Apache License, Version 2.0 (the "License");
// you may not use this file except in compliance with the License.
// You may obtain a copy of the License at
//
//      http://www.apache.org/licenses/LICENSE-2.0
//
// Unless required by applicable law or agreed to in writing, software
// distributed under the License is distributed on an "AS IS" BASIS,
// WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
// See the License for the specific language governing permissions and
// limitations under the License.

package main

import (
	"database/sql"
	"time"

	"github.com/google/uuid"
	"github.com/pkg/errors"
	_ "modernc.org/sqlite"
)

const initSQL = `
CREATE TABLE IF NOT EXISTS reviews (
	id TEXT PRIMARY KEY,
	product_id TEXT NOT NULL,
	user_name TEXT NOT NULL,
	rating INTEGER NOT NULL CHECK(rating >= 1 AND rating <= 5),
	title TEXT NOT NULL,
	content TEXT NOT NULL,
	created_at DATETIME DEFAULT CURRENT_TIMESTAMP
);
CREATE INDEX IF NOT EXISTS idx_reviews_product_id ON reviews(product_id);
`

type reviewDB struct {
	db *sql.DB
}

func newReviewDB(dataSource string) (*reviewDB, error) {
	db, err := sql.Open("sqlite", dataSource)
	if err != nil {
		return nil, errors.Wrap(err, "failed to open sqlite database")
	}

	// Limit to a single connection to eliminate concurrent SQLite lock contention.
	// With WAL mode reads can proceed in parallel; limit to 5 connections
	// to balance concurrency without overwhelming SQLite's single-writer lock.
	db.SetMaxOpenConns(5)
	db.SetMaxIdleConns(5)
	db.SetConnMaxLifetime(0)

	if err := db.Ping(); err != nil {
		return nil, errors.Wrap(err, "failed to ping sqlite database")
	}

	// Enable WAL mode and performance pragmas.
	// WAL allows concurrent reads even while a write is in progress.
	// busy_timeout makes SQLite wait for the lock instead of failing immediately.
	// synchronous=NORMAL improves write speed without compromising crash safety in WAL mode.
	// cache_size increases memory cache for faster reads.
	// temp_store=MEMORY avoids disk writes for temp tables.
	if _, err := db.Exec(`
		PRAGMA journal_mode=WAL;
		PRAGMA busy_timeout=5000;
		PRAGMA synchronous=NORMAL;
		PRAGMA cache_size=-20000;
		PRAGMA temp_store=MEMORY;
	`); err != nil {
		return nil, errors.Wrap(err, "failed to set sqlite pragmas")
	}

	if _, err := db.Exec(initSQL); err != nil {
		return nil, errors.Wrap(err, "failed to initialize database schema")
	}
	return &reviewDB{db: db}, nil
}

func (r *reviewDB) close() error {
	return r.db.Close()
}

func (r *reviewDB) createReview(req *CreateReviewRequest) (*Review, error) {
	review := &Review{
		ID:        uuid.New().String(),
		ProductID: req.ProductID,
		UserName:  req.UserName,
		Rating:    req.Rating,
		Title:     req.Title,
		Content:   req.Content,
		CreatedAt: time.Now(),
	}
	_, err := r.db.Exec(
		"INSERT INTO reviews (id, product_id, user_name, rating, title, content, created_at) VALUES (?, ?, ?, ?, ?, ?, ?)",
		review.ID, review.ProductID, review.UserName, review.Rating, review.Title, review.Content, review.CreatedAt,
	)
	if err != nil {
		return nil, errors.Wrap(err, "failed to insert review")
	}
	return review, nil
}

func (r *reviewDB) getReview(id string) (*Review, error) {
	row := r.db.QueryRow(
		"SELECT id, product_id, user_name, rating, title, content, created_at FROM reviews WHERE id = ?",
		id,
	)
	review := &Review{}
	var createdAtStr string
	err := row.Scan(&review.ID, &review.ProductID, &review.UserName, &review.Rating, &review.Title, &review.Content, &createdAtStr)
	if err == sql.ErrNoRows {
		return nil, nil
	}
	if err != nil {
		return nil, errors.Wrap(err, "failed to scan review")
	}
	review.CreatedAt, _ = time.Parse(time.RFC3339, createdAtStr)
	if review.CreatedAt.IsZero() {
		review.CreatedAt, _ = time.Parse("2006-01-02 15:04:05", createdAtStr)
	}
	return review, nil
}

func (r *reviewDB) getReviewsByProduct(productID string) ([]*Review, error) {
	rows, err := r.db.Query(
		"SELECT id, product_id, user_name, rating, title, content, created_at FROM reviews WHERE product_id = ? ORDER BY created_at DESC",
		productID,
	)
	if err != nil {
		return nil, errors.Wrap(err, "failed to query reviews")
	}
	defer rows.Close()

	var reviews []*Review
	for rows.Next() {
		review := &Review{}
		var createdAtStr string
		if err := rows.Scan(&review.ID, &review.ProductID, &review.UserName, &review.Rating, &review.Title, &review.Content, &createdAtStr); err != nil {
			return nil, errors.Wrap(err, "failed to scan review row")
		}
		review.CreatedAt, _ = time.Parse(time.RFC3339, createdAtStr)
		if review.CreatedAt.IsZero() {
			review.CreatedAt, _ = time.Parse("2006-01-02 15:04:05", createdAtStr)
		}
		reviews = append(reviews, review)
	}
	return reviews, rows.Err()
}

func (r *reviewDB) deleteReview(id string) error {
	result, err := r.db.Exec("DELETE FROM reviews WHERE id = ?", id)
	if err != nil {
		return errors.Wrap(err, "failed to delete review")
	}
	rowsAffected, err := result.RowsAffected()
	if err != nil {
		return errors.Wrap(err, "failed to get rows affected")
	}
	if rowsAffected == 0 {
		return errors.New("review not found")
	}
	return nil
}

func (r *reviewDB) getReviewStats(productID string) (*ReviewStats, error) {
	row := r.db.QueryRow(
		"SELECT COALESCE(AVG(rating), 0), COUNT(*) FROM reviews WHERE product_id = ?",
		productID,
	)
	stats := &ReviewStats{ProductID: productID}
	if err := row.Scan(&stats.AverageRating, &stats.TotalReviews); err != nil {
		return nil, errors.Wrap(err, "failed to scan review stats")
	}
	return stats, nil
}
