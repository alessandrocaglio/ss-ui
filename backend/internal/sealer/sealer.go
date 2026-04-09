package sealer

import (
	"context"
	"crypto/rand"
	"crypto/rsa"
	"encoding/base64"
	"errors"
	"fmt"
	"sort"

	"github.com/bitnami-labs/sealed-secrets/pkg/crypto"
	corev1 "k8s.io/api/core/v1"
	"sigs.k8s.io/yaml"
)

var (
	ErrEmptyData = errors.New("cannot seal an empty secret")
)

type SealRequest struct {
	Name        string            `json:"name"`
	Namespace   string            `json:"namespace"`
	Labels      map[string]string `json:"labels,omitempty"`
	Annotations map[string]string `json:"annotations,omitempty"`
	Type        string            `json:"type"`
	Data        map[string]string `json:"data"`
	Scope       string            `json:"scope"`
	SecretYaml  string            `json:"secretYaml,omitempty"`
}

type SealerImpl struct{}

func NewSealer() *SealerImpl {
	return &SealerImpl{}
}

func (s *SealerImpl) Seal(ctx context.Context, req SealRequest, pubKey *rsa.PublicKey) ([]byte, map[string]string, error) {
	// If raw YAML is provided, parse it to extract fields and override the request
	if req.SecretYaml != "" {
		var secret corev1.Secret
		if err := yaml.UnmarshalStrict([]byte(req.SecretYaml), &secret); err != nil {
			// Fallback to normal unmarshal if Strict fails (in case of unknown fields)
			if err := yaml.Unmarshal([]byte(req.SecretYaml), &secret); err != nil {
				return nil, nil, fmt.Errorf("failed to parse raw Secret YAML: %w", err)
			}
		}

		if secret.Kind != "" && secret.Kind != "Secret" {
			return nil, nil, fmt.Errorf("provided YAML is not a Secret (kind: %s)", secret.Kind)
		}

		req.Name = secret.Name
		req.Namespace = secret.Namespace
		req.Labels = secret.Labels
		req.Annotations = secret.Annotations
		req.Type = string(secret.Type)

		if req.Data == nil {
			req.Data = make(map[string]string)
		}

		// Read base64 data
		for k, v := range secret.Data {
			req.Data[k] = string(v)
		}
		// Read stringData
		for k, v := range secret.StringData {
			req.Data[k] = v
		}
	}

	if len(req.Data) == 0 {
		return nil, nil, ErrEmptyData
	}

	// Determine Label based on scope
	var label []byte
	scopeAnn := ""
	switch req.Scope {
	case "namespace-wide":
		label = []byte(req.Namespace)
		scopeAnn = "sealedsecrets.bitnami.com/namespace-wide"
	case "cluster-wide":
		label = []byte("")
		scopeAnn = "sealedsecrets.bitnami.com/cluster-wide"
	default: // "strict"
		label = []byte(fmt.Sprintf("%s/%s", req.Namespace, req.Name))
	}

	// Prepare metadata
	if req.Annotations == nil {
		req.Annotations = make(map[string]string)
	}
	if scopeAnn != "" {
		req.Annotations[scopeAnn] = "true"
	}

	encryptedData := make(map[string]string)

	// Encrypt each item deterministically
	var keys []string
	for k := range req.Data {
		keys = append(keys, k)
	}
	sort.Strings(keys)

	for _, k := range keys {
		plaintext := []byte(req.Data[k])

		ciphertext, err := crypto.HybridEncrypt(rand.Reader, pubKey, plaintext, label)
		if err != nil {
			return nil, nil, fmt.Errorf("failed to encrypt key %s: %w", k, err)
		}

		encryptedData[k] = base64.StdEncoding.EncodeToString(ciphertext)
	}

	// Generate Output Structure matching Bitnami SealedSecrets strictly without requiring schema
	outputFormat := map[string]interface{}{
		"apiVersion": "bitnami.com/v1alpha1",
		"kind":       "SealedSecret",
		"metadata": map[string]interface{}{
			"name":        req.Name,
			"namespace":   req.Namespace,
			"labels":      req.Labels,
			"annotations": req.Annotations,
		},
		"spec": map[string]interface{}{
			"encryptedData": encryptedData,
			"template": map[string]interface{}{
				"type": req.Type,
				"metadata": map[string]interface{}{
					"name":        req.Name,
					"namespace":   req.Namespace,
					"labels":      req.Labels,
					"annotations": req.Annotations, // Keep annotations in template as well, or strip scope? Typically both.
				},
			},
		},
	}

	// Clean empty maps to avoid noisy YAML output
	meta := outputFormat["metadata"].(map[string]interface{})
	if len(req.Labels) == 0 {
		delete(meta, "labels")
		delete(outputFormat["spec"].(map[string]interface{})["template"].(map[string]interface{})["metadata"].(map[string]interface{}), "labels")
	}
	if len(req.Annotations) == 0 {
		delete(meta, "annotations")
		delete(outputFormat["spec"].(map[string]interface{})["template"].(map[string]interface{})["metadata"].(map[string]interface{}), "annotations")
	}

	yamlData, err := yaml.Marshal(outputFormat)
	if err != nil {
		return nil, nil, err
	}

	return yamlData, encryptedData, nil
}
