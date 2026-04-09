package sealer_test

import (
	"context"
	"crypto/rand"
	"crypto/rsa"
	"testing"

	"ss-ui/internal/sealer"
)

func TestSealer_RawYAMLMode(t *testing.T) {
	s := sealer.NewSealer()

	privateKey, err := rsa.GenerateKey(rand.Reader, 2048)
	if err != nil {
		t.Fatalf("Failed to generate test key: %v", err)
	}

	rawYaml := `
apiVersion: v1
kind: Secret
metadata:
  name: test-db
  namespace: prod
type: Opaque
stringData:
  pass: "supersecret"
`

	req := sealer.SealRequest{SecretYaml: rawYaml, Scope: "strict"}
	
	bytes, _, err := s.Seal(context.Background(), req, &privateKey.PublicKey)
	if err != nil {
		t.Fatalf("Seal failed: %v", err)
	}

	if len(bytes) == 0 {
		t.Fatal("Output yaml is empty")
	}
}
