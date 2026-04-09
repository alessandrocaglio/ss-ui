# Sealed Secret UI (`ss-ui`)

**ss-ui** is a robust, full-stack web application designed for OpenShift and Kubernetes operators. It provides a graphical interface equivalent to the native OpenShift "Create Secret" form, allowing you to securely construct `SealedSecret` manifests directly through a browser UI without relying entirely on the `kubeseal` CLI. 

This application guarantees completely stateless execution – no secrets are persistently logged, cached, or sent anywhere except straight out the browser in bit-perfect Bitnami encrypted YAML structures.

---

## 🚀 How to Run Locally

You can run `ss-ui` seamlessly on your local machine using either Podman or Docker Compose. This is ideal if you want to generate Sealed Secrets without installing `kubeseal`.

### Option 1: Running with Podman (Recommended for Linux/Red Hat)

By default, the container will start fresh. You can upload any exported OpenShift certificate `.pem` file directly via the browser UI!

```bash
podman run -d \
  --name ss-ui \
  -p 8080:8080 \
  quay.io/my-username/ss-ui:latest
```

**Pre-loading a Certificate offline:**
If you already pulled your cluster's public `.pem` certificate locally, you can mount it into the container so you don't have to upload it later. *(Note: The `:Z` flag guarantees SELinux allows the container backend to read it).*

```bash
podman run -d \
  --name ss-ui \
  -p 8080:8080 \
  -v $(pwd)/dev/test-cert.pem:/app/cert.pem:Z \
  -e CERT_FILE=/app/cert.pem \
  quay.io/my-username/ss-ui:latest
```
*Navigate to [http://localhost:8080](http://localhost:8080) to access the application.*

### Option 2: Running with Docker Compose

If you use Docker Desktop or Docker Compose, we provide a pre-configured architecture.

First, create a `docker-compose.yml` file:
```yaml
version: '3.8'

services:
  ss-ui:
    image: quay.io/my-username/ss-ui:latest
    ports:
      - "8080:8080"
    environment:
      # Optional: Maps a local certificate if mounted
      - CERT_FILE=/app/cert.pem
    volumes:
      # Optional: Mounts a public cert into the container natively
      - ./dev/test-cert.pem:/app/cert.pem
```

Launch the service in the background:
```bash
docker-compose up -d
```
*Navigate to [http://localhost:8080](http://localhost:8080) to access the application.*

---

## ☸️ How to Deploy on Kubernetes / OpenShift

Deploying `ss-ui` natively into your cluster is the most powerful way to use it! When running inside OpenShift, `ss-ui` will dynamically resolve the cluster's Sealed Secrets API service automatically and utilize its certificates without requiring you to manually download or mount `.pem` files.

Deploying is as simple as applying the pre-packaged manifests mapping the Deployment, Service, ServiceAccount, and Route:

```bash
kubectl apply -f deploy/
```

This creates an OpenShift `Route`. You can retrieve your newly generated GUI web address immediately using:
```bash
oc get route ss-ui
```

### Advanced Cluster Configuration

If you didn't install the Bitnami `sealed-secrets` controller into the default `kube-system` namespace, you can instruct `ss-ui` where to find it by updating the environment variables mapped inside your `deployment.yaml`:

```yaml
          env:
            - name: CONTROLLER_NAMESPACE
              value: "my-custom-namespace"  # Update to where your Bitnami controller is installed
            - name: CONTROLLER_NAME
              value: "sealed-secrets"       # Only needed if the pod controller name is different
```

---

## 🌟 Application Features & Usage

*   **Zero-State Security Model**: Secrets are instantly processed, structured, and wiped. Uploaded PEM certificates never touch the disk and live entirely in-memory.
*   **GitOps Toggle Logic**: Need to render standard secrets into a flat-structured custom list for your GitOps configurations? Instantly flip the radio button under the output code editor to convert conventional `bitnami.com/v1alpha1` manifests entirely!
*   **Raw YAML Fallbacks**: Need to port over huge chunks of old code? Paste native unencrypted Kubernetes `kind: Secret` YAMLs right into the dashboard and let the frontend automatically parse and safely bridge them for you directly on the fly.
