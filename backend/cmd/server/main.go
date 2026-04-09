package main

import (
	"context"
	"embed"
	"io/fs"
	"log/slog"
	"net/http"
	"os"
	"os/signal"
	"strings"
	"syscall"
	"time"

	"github.com/go-chi/chi/v5"
	chimiddleware "github.com/go-chi/chi/v5/middleware"
	"github.com/go-chi/cors"

	"ss-ui/internal/certprovider"
	"ss-ui/internal/config"
	"ss-ui/internal/handler"
	"ss-ui/internal/middleware"
	"ss-ui/internal/sealer"
)

//go:embed all:frontend/dist
var frontendFS embed.FS

var version = "dev"

func setupLogger(level string) {
	var l slog.Level
	if err := l.UnmarshalText([]byte(level)); err != nil {
		l = slog.LevelInfo
	}
	logger := slog.New(slog.NewJSONHandler(os.Stdout, &slog.HandlerOptions{Level: l}))
	slog.SetDefault(logger)
}

func main() {
	cfg := config.LoadConfig()
	setupLogger(cfg.LogLevel)

	slog.Info("Starting ss-ui", "version", version, "port", cfg.Port)

	// Providers
	uploadProv := certprovider.NewUploadProvider()
	fileProv := certprovider.NewFileProvider(cfg.CertFile)
	ctrlProv := certprovider.NewControllerProvider(cfg.CertURL, cfg.ControllerName, cfg.ControllerNamespace, cfg.CertCacheTTL)

	manager := certprovider.NewCertManager(uploadProv, fileProv, ctrlProv)
	if err := manager.Init(); err != nil {
		slog.Error("Failed to initialize certificate manager", "err", err)
	}

	// Sealer
	slr := sealer.NewSealer()

	// Handlers
	healthH := handler.NewHealthHandler(manager)
	certH := handler.NewCertHandler(manager)
	uploadH := handler.NewCertUploadHandler(manager)
	sealH := handler.NewSealHandler(manager, slr)

	// Router
	r := chi.NewRouter()

	r.Use(chimiddleware.RequestID)
	r.Use(middleware.Logger)
	r.Use(chimiddleware.Recoverer)

	var allowedOrigins []string
	if cfg.AllowedOrigins == "*" {
		allowedOrigins = []string{"*"}
	} else {
		allowedOrigins = strings.Split(cfg.AllowedOrigins, ",")
	}
	r.Use(cors.Handler(cors.Options{
		AllowedOrigins:   allowedOrigins,
		AllowedMethods:   []string{"GET", "POST", "PUT", "OPTIONS"},
		AllowedHeaders:   []string{"Accept", "Authorization", "Content-Type", "X-CSRF-Token"},
		ExposedHeaders:   []string{"Link"},
		AllowCredentials: true,
		MaxAge:           300,
	}))

	r.Route("/api/v1", func(r chi.Router) {
		r.Get("/health", healthH.ServeHTTP)
		r.Get("/cert", certH.GetCert)
		r.Put("/cert/source", certH.SwitchSource)
		r.Post("/cert/upload", uploadH.ServeHTTP)
		r.Post("/seal", sealH.ServeHTTP)
	})

	// Serve static files
	dist, err := fs.Sub(frontendFS, "frontend/dist")
	if err != nil {
		// fallback for local dev if empty
		dist = os.DirFS(".")
	}
	fileServer := http.FileServer(http.FS(dist))
	r.Handle("/*", http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
		// Very simple SPA routing
		path := r.URL.Path
		if path != "/" {
			f, err := dist.Open(strings.TrimPrefix(path, "/"))
			if err != nil {
				r.URL.Path = "/"
			} else {
				f.Close()
			}
		}
		fileServer.ServeHTTP(w, r)
	}))

	srv := &http.Server{
		Addr:         ":" + cfg.Port,
		Handler:      r,
		ReadTimeout:  cfg.ReadTimeout,
		WriteTimeout: cfg.WriteTimeout,
	}

	go func() {
		if err := srv.ListenAndServe(); err != nil && err != http.ErrServerClosed {
			slog.Error("Server failed", "err", err)
			os.Exit(1)
		}
	}()

	// Graceful shutdown
	quit := make(chan os.Signal, 1)
	signal.Notify(quit, syscall.SIGINT, syscall.SIGTERM)
	<-quit

	slog.Info("Shutting down server...")
	ctx, cancel := context.WithTimeout(context.Background(), 15*time.Second)
	defer cancel()

	if err := srv.Shutdown(ctx); err != nil {
		slog.Error("Server forced to shutdown", "err", err)
	}
	slog.Info("Server exiting")
}
