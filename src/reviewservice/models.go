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

import "time"

// Review represents a product review submitted by a user.
type Review struct {
	ID        string    `json:"id"`
	ProductID string    `json:"product_id"`
	UserName  string    `json:"user_name"`
	Rating    int       `json:"rating"`
	Title     string    `json:"title"`
	Content   string    `json:"content"`
	CreatedAt time.Time `json:"created_at"`
}

// ReviewStats holds aggregated statistics for product reviews.
type ReviewStats struct {
	ProductID    string  `json:"product_id"`
	AverageRating float64 `json:"average_rating"`
	TotalReviews  int     `json:"total_reviews"`
}

// CreateReviewRequest is the payload for creating a new review.
type CreateReviewRequest struct {
	ProductID string `json:"product_id"`
	UserName  string `json:"user_name"`
	Rating    int    `json:"rating"`
	Title     string `json:"title"`
	Content   string `json:"content"`
}
