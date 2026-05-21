# MAC System K8s 部署

## 架構
```
[瀏覽器] → [mac-web:30080] → [postgrest:3001] → [postgres:5432]
```

## 部署步驟

### 1. 建立 namespace 和 secrets
```bash
kubectl apply -f k8s/namespace.yaml
kubectl apply -f k8s/secrets.yaml
```

### 2. 建立 PostgreSQL init ConfigMap（用 SQL 檔案產生）
```bash
kubectl create configmap postgres-init \
  --from-file=01-setup.sql=local-postgres-setup.sql \
  --from-file=02-seed.sql=local-postgres-seed.sql \
  -n mac-system
```

### 3. 部署 PostgreSQL
```bash
kubectl apply -f k8s/postgres.yaml
# 等待 ready
kubectl wait --for=condition=ready pod -l app=postgres -n mac-system --timeout=60s
```

### 4. 部署 PostgREST
```bash
kubectl apply -f k8s/postgrest.yaml
```

### 5. 建置並部署 Next.js
```bash
# 建置 Docker image
docker build -t mac-web:latest .

# 如果用 K3s/minikube，需要載入 image
# minikube: eval $(minikube docker-env) && docker build -t mac-web:latest .
# k3s: docker save mac-web:latest | k3s ctr images import -

kubectl apply -f k8s/nextjs.yaml
```

### 6. 存取
```
http://<node-ip>:30080
```

## 登入帳號
| 帳號 | 密碼 | 角色 |
|------|------|------|
| admin@mac.gov.tw | 1qaz@WSX3edc | admin |
| operator@mac.gov.tw | operator123 | user |
