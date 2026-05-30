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
	"encoding/json"
	"net/http"
	"time"

	"github.com/gorilla/mux"
)

func (s *server) healthHandler(w http.ResponseWriter, r *http.Request) {
	w.Header().Set("Content-Type", "text/plain")
	w.WriteHeader(http.StatusOK)
	w.Write([]byte("ok"))
}

func (s *server) createReviewHandler(w http.ResponseWriter, r *http.Request) {
	log := s.log.WithField("handler", "createReview")
	var req CreateReviewRequest
	if err := json.NewDecoder(r.Body).Decode(&req); err != nil {
		log.WithError(err).Warn("failed to decode request body")
		writeError(w, http.StatusBadRequest, "invalid request body")
		return
	}

	// Validate request
	if req.ProductID == "" {
		writeError(w, http.StatusBadRequest, "product_id is required")
		return
	}
	if req.UserName == "" {
		writeError(w, http.StatusBadRequest, "user_name is required")
		return
	}
	if req.Rating < 1 || req.Rating > 5 {
		writeError(w, http.StatusBadRequest, "rating must be between 1 and 5")
		return
	}
	if req.Title == "" {
		writeError(w, http.StatusBadRequest, "title is required")
		return
	}
	if req.Content == "" {
		writeError(w, http.StatusBadRequest, "content is required")
		return
	}

	review, err := s.db.createReview(&req)
	if err != nil {
		log.WithError(err).Error("failed to create review")
		writeError(w, http.StatusInternalServerError, "failed to create review")
		return
	}

	log.WithField("review_id", review.ID).Info("review created")
	w.Header().Set("Content-Type", "application/json")
	w.WriteHeader(http.StatusCreated)
	json.NewEncoder(w).Encode(review)
}

func (s *server) getReviewsHandler(w http.ResponseWriter, r *http.Request) {
	log := s.log.WithField("handler", "getReviews")
	productID := r.URL.Query().Get("product_id")
	if productID == "" {
		writeError(w, http.StatusBadRequest, "product_id query parameter is required")
		return
	}

	reviews, err := s.db.getReviewsByProduct(productID)
	if err != nil {
		log.WithError(err).Error("failed to get reviews")
		writeError(w, http.StatusInternalServerError, "failed to get reviews")
		return
	}

	w.Header().Set("Content-Type", "application/json")
	json.NewEncoder(w).Encode(map[string]interface{}{
		"reviews": reviews,
	})
}

func (s *server) getReviewHandler(w http.ResponseWriter, r *http.Request) {
	log := s.log.WithField("handler", "getReview")
	id := mux.Vars(r)["id"]
	if id == "" {
		writeError(w, http.StatusBadRequest, "review id is required")
		return
	}

	review, err := s.db.getReview(id)
	if err != nil {
		log.WithError(err).Error("failed to get review")
		writeError(w, http.StatusInternalServerError, "failed to get review")
		return
	}
	if review == nil {
		writeError(w, http.StatusNotFound, "review not found")
		return
	}

	w.Header().Set("Content-Type", "application/json")
	json.NewEncoder(w).Encode(review)
}

func (s *server) deleteReviewHandler(w http.ResponseWriter, r *http.Request) {
	log := s.log.WithField("handler", "deleteReview")
	id := mux.Vars(r)["id"]
	if id == "" {
		writeError(w, http.StatusBadRequest, "review id is required")
		return
	}

	if err := s.db.deleteReview(id); err != nil {
		log.WithError(err).Error("failed to delete review")
		writeError(w, http.StatusInternalServerError, err.Error())
		return
	}

	log.WithField("review_id", id).Info("review deleted")
	w.WriteHeader(http.StatusNoContent)
}

func (s *server) getReviewStatsHandler(w http.ResponseWriter, r *http.Request) {
	log := s.log.WithField("handler", "getReviewStats")
	productID := r.URL.Query().Get("product_id")
	if productID == "" {
		writeError(w, http.StatusBadRequest, "product_id query parameter is required")
		return
	}

	stats, err := s.db.getReviewStats(productID)
	if err != nil {
		log.WithError(err).Error("failed to get review stats")
		writeError(w, http.StatusInternalServerError, "failed to get review stats")
		return
	}

	w.Header().Set("Content-Type", "application/json")
	json.NewEncoder(w).Encode(stats)
}

func writeError(w http.ResponseWriter, code int, message string) {
	w.Header().Set("Content-Type", "application/json")
	w.WriteHeader(code)
	json.NewEncoder(w).Encode(map[string]interface{}{
		"error":     message,
		"timestamp": time.Now().UTC(),
	})
}
