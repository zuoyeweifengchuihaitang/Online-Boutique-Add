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
	"net/http"
	"os"
	"time"

	"github.com/gorilla/mux"
	"github.com/sirupsen/logrus"
)

const defaultPort = "8080"

type server struct {
	db  *reviewDB
	log *logrus.Logger
}

func main() {
	log := logrus.New()
	log.Level = logrus.DebugLevel
	log.Formatter = &logrus.JSONFormatter{
		FieldMap: logrus.FieldMap{
			logrus.FieldKeyTime:  "timestamp",
			logrus.FieldKeyLevel: "severity",
			logrus.FieldKeyMsg:   "message",
		},
		TimestampFormat: time.RFC3339Nano,
	}
	log.Out = os.Stdout

	// SQLite data source: in-memory or file-based
	dataSource := os.Getenv("SQLITE_DB_PATH")
	if dataSource == "" {
		dataSource = ":memory:"
	}
	log.Infof("using sqlite database: %s", dataSource)

	db, err := newReviewDB(dataSource)
	if err != nil {
		log.WithError(err).Fatal("failed to initialize database")
	}
	defer db.close()

	srv := &server{
		db:  db,
		log: log,
	}

	port := defaultPort
	if os.Getenv("PORT") != "" {
		port = os.Getenv("PORT")
	}

	r := mux.NewRouter()
	r.HandleFunc("/_healthz", srv.healthHandler).Methods(http.MethodGet)
	r.HandleFunc("/reviews", srv.createReviewHandler).Methods(http.MethodPost)
	r.HandleFunc("/reviews", srv.getReviewsHandler).Methods(http.MethodGet)
	r.HandleFunc("/reviews/stats", srv.getReviewStatsHandler).Methods(http.MethodGet)
	r.HandleFunc("/reviews/{id}", srv.getReviewHandler).Methods(http.MethodGet)
	r.HandleFunc("/reviews/{id}", srv.deleteReviewHandler).Methods(http.MethodDelete)

	log.Infof("starting review service on port %s", port)
	if err := http.ListenAndServe(":"+port, r); err != nil {
		log.WithError(err).Fatal("failed to start server")
	}
}
