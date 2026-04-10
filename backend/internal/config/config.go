package config

import (
	"flag"
	"os"
	"time"
)

type Config struct {
	Port                string
	ReadTimeout         time.Duration
	WriteTimeout        time.Duration
	CertFile            string
	CertURL             string
	ControllerName      string
	ControllerNamespace string
	CertCacheTTL        time.Duration
	AllowedOrigins      string
	KubeconfigPath      string
	LogLevel            string
	Insecure            bool
}

func getEnv(key, defaultVal string) string {
	if val := os.Getenv(key); val != "" {
		return val
	}
	return defaultVal
}

func getEnvBool(key string, defaultVal bool) bool {
	if val := os.Getenv(key); val != "" {
		return val == "true" || val == "1" || val == "yes"
	}
	return defaultVal
}

func getEnvDuration(key string, defaultVal time.Duration) time.Duration {
	if val := os.Getenv(key); val != "" {
		d, err := time.ParseDuration(val)
		if err == nil {
			return d
		}
	}
	return defaultVal
}

func LoadConfig() *Config {
	cfg := &Config{}

	flag.StringVar(&cfg.Port, "port", getEnv("PORT", "8080"), "Port to listen on")
	flag.DurationVar(&cfg.ReadTimeout, "read-timeout", getEnvDuration("READ_TIMEOUT", 10*time.Second), "HTTP read timeout")
	flag.DurationVar(&cfg.WriteTimeout, "write-timeout", getEnvDuration("WRITE_TIMEOUT", 30*time.Second), "HTTP write timeout")
	flag.StringVar(&cfg.CertFile, "cert-file", getEnv("CERT_FILE", ""), "Path to a PEM certificate to pre-load (File source)")
	flag.StringVar(&cfg.CertURL, "cert-url", getEnv("CERT_URL", ""), "Direct URL to fetch the certificate from (Controller source)")
	flag.StringVar(&cfg.ControllerName, "controller-name", getEnv("CONTROLLER_NAME", "sealed-secrets"), "Name of the in-cluster sealed-secrets service")
	flag.StringVar(&cfg.ControllerNamespace, "controller-namespace", getEnv("CONTROLLER_NAMESPACE", "kube-system"), "Namespace of the in-cluster sealed-secrets service")
	flag.DurationVar(&cfg.CertCacheTTL, "cert-cache-ttl", getEnvDuration("CERT_CACHE_TTL", time.Hour), "TTL for cached certificates fetched from the Controller")
	flag.StringVar(&cfg.AllowedOrigins, "allowed-origins", getEnv("ALLOWED_ORIGINS", "*"), "CORS allowed origins (comma separated)")
	flag.StringVar(&cfg.KubeconfigPath, "kubeconfig", getEnv("KUBECONFIG", ""), "Path to kubeconfig file")
	flag.StringVar(&cfg.LogLevel, "log-level", getEnv("LOG_LEVEL", "info"), "Log level (debug, info, warn, error)")
	flag.BoolVar(&cfg.Insecure, "insecure", getEnvBool("INSECURE", false), "Allow revealing secret values in the UI (Insecure mode)")

	flag.Parse()

	return cfg
}
