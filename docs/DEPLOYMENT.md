# Twin Gate - 部署指南

## 📋 文檔資訊

- **版本**：v1.0.0
- **創建日期**：2025-01-26
- **最後更新**：2025-01-26
- **部署平台**：Google Cloud Run
- **維護者**：[@cis2042](https://github.com/cis2042)

## 🎯 部署概覽

Twin Gate 採用容器化部署方式，主要部署在 Google Cloud Run 平台上，提供自動擴展、高可用性和成本效益的解決方案。

### 架構圖
```
Internet → Cloud Load Balancer → Cloud Run → Cloud SQL (PostgreSQL)
                                     ↓
                              Twin3.ai API
```

## 🔧 前置要求

### 必要工具
- **Docker**: v24.0.0+
- **Google Cloud SDK**: v450.0.0+
- **Node.js**: v18.19.0+ (本地開發)
- **Git**: v2.40.0+

### 必要帳戶和服務
- Google Cloud Platform 帳戶
- Telegram Bot Token
- Twin3.ai API Key
- GitHub 帳戶 (CI/CD)

### 權限要求
```bash
# Google Cloud 必要權限
- Cloud Run Admin
- Cloud SQL Admin
- Container Registry Admin
- IAM Admin
- Service Account Admin
```

## 🏗️ 環境設置

### 1. Google Cloud 項目設置

#### 創建新項目
```bash
# 設置項目 ID
export PROJECT_ID="twin-gate-prod"

# 創建項目
gcloud projects create $PROJECT_ID

# 設置當前項目
gcloud config set project $PROJECT_ID

# 啟用必要的 API
gcloud services enable run.googleapis.com
gcloud services enable sql-component.googleapis.com
gcloud services enable sqladmin.googleapis.com
gcloud services enable containerregistry.googleapis.com
```

#### 設置服務帳戶
```bash
# 創建服務帳戶
gcloud iam service-accounts create twin-gate-service \
    --description="Twin Gate service account" \
    --display-name="Twin Gate Service"

# 授予權限
gcloud projects add-iam-policy-binding $PROJECT_ID \
    --member="serviceAccount:twin-gate-service@$PROJECT_ID.iam.gserviceaccount.com" \
    --role="roles/cloudsql.client"

# 創建並下載金鑰
gcloud iam service-accounts keys create key.json \
    --iam-account=twin-gate-service@$PROJECT_ID.iam.gserviceaccount.com
```

### 2. 數據庫設置

#### 創建 Cloud SQL 實例
```bash
# 創建 PostgreSQL 實例
gcloud sql instances create twin-gate-db \
    --database-version=POSTGRES_14 \
    --tier=db-f1-micro \
    --region=asia-east1 \
    --storage-type=SSD \
    --storage-size=10GB \
    --backup-start-time=03:00

# 設置 root 密碼
gcloud sql users set-password postgres \
    --instance=twin-gate-db \
    --password=YOUR_SECURE_PASSWORD

# 創建應用數據庫
gcloud sql databases create twingate \
    --instance=twin-gate-db

# 創建應用用戶
gcloud sql users create twingate_user \
    --instance=twin-gate-db \
    --password=YOUR_APP_PASSWORD
```

#### 配置網絡訪問
```bash
# 允許 Cloud Run 訪問
gcloud sql instances patch twin-gate-db \
    --authorized-networks=0.0.0.0/0 \
    --backup-start-time=03:00
```

### 3. 容器註冊表設置

#### 配置 Docker 認證
```bash
# 配置 Docker 使用 gcloud 認證
gcloud auth configure-docker

# 設置映像標籤
export IMAGE_TAG="gcr.io/$PROJECT_ID/twin-gate:latest"
```

## 📦 應用部署

### 1. 構建 Docker 映像

#### Dockerfile 優化
```dockerfile
# 多階段構建
FROM node:18-alpine AS builder

WORKDIR /app
COPY package*.json ./
RUN npm ci --only=production

FROM node:18-alpine AS runtime

# 安全性設置
RUN addgroup -g 1001 -S nodejs
RUN adduser -S nextjs -u 1001

WORKDIR /app
COPY --from=builder /app/node_modules ./node_modules
COPY . .

# 設置權限
USER nextjs

EXPOSE 3000
CMD ["npm", "start"]
```

#### 構建和推送
```bash
# 構建映像
docker build -t $IMAGE_TAG .

# 推送到 Container Registry
docker push $IMAGE_TAG
```

### 2. 部署到 Cloud Run

#### 基本部署
```bash
# 部署服務
gcloud run deploy twin-gate \
    --image=$IMAGE_TAG \
    --platform=managed \
    --region=asia-east1 \
    --allow-unauthenticated \
    --memory=512Mi \
    --cpu=1 \
    --concurrency=1000 \
    --timeout=300 \
    --max-instances=10
```

#### 環境變量設置
```bash
# 設置環境變量
gcloud run services update twin-gate \
    --set-env-vars="NODE_ENV=production" \
    --set-env-vars="PORT=3000" \
    --set-env-vars="BOT_TOKEN=YOUR_BOT_TOKEN" \
    --set-env-vars="TWIN3_API_KEY=YOUR_API_KEY" \
    --set-env-vars="DATABASE_URL=postgresql://user:pass@host:5432/db"
```

#### 設置 Cloud SQL 連接
```bash
# 添加 Cloud SQL 連接
gcloud run services update twin-gate \
    --add-cloudsql-instances=$PROJECT_ID:asia-east1:twin-gate-db \
    --set-env-vars="DB_HOST=/cloudsql/$PROJECT_ID:asia-east1:twin-gate-db"
```

## 🔄 CI/CD 設置

### 1. GitHub Actions 工作流

#### `.github/workflows/deploy.yml`
```yaml
name: Deploy to Cloud Run

on:
  push:
    branches: [ main ]

env:
  PROJECT_ID: twin-gate-prod
  SERVICE_NAME: twin-gate
  REGION: asia-east1

jobs:
  deploy:
    runs-on: ubuntu-latest
    
    steps:
    - name: Checkout
      uses: actions/checkout@v4

    - name: Setup Google Cloud CLI
      uses: google-github-actions/setup-gcloud@v1
      with:
        service_account_key: ${{ secrets.GCP_SA_KEY }}
        project_id: ${{ env.PROJECT_ID }}

    - name: Configure Docker
      run: gcloud auth configure-docker

    - name: Build and Push
      run: |
        docker build -t gcr.io/$PROJECT_ID/$SERVICE_NAME:$GITHUB_SHA .
        docker push gcr.io/$PROJECT_ID/$SERVICE_NAME:$GITHUB_SHA

    - name: Deploy to Cloud Run
      run: |
        gcloud run deploy $SERVICE_NAME \
          --image gcr.io/$PROJECT_ID/$SERVICE_NAME:$GITHUB_SHA \
          --platform managed \
          --region $REGION \
          --allow-unauthenticated
```

### 2. GitHub Secrets 設置
```bash
# 必要的 Secrets
GCP_SA_KEY          # Google Cloud 服務帳戶金鑰
BOT_TOKEN           # Telegram Bot Token
TWIN3_API_KEY       # Twin3.ai API Key
DATABASE_URL        # 數據庫連接字符串
```

## 📊 監控和日誌

### 1. Cloud Monitoring 設置

#### 創建告警策略
```bash
# CPU 使用率告警
gcloud alpha monitoring policies create \
    --policy-from-file=monitoring/cpu-alert.yaml

# 記憶體使用率告警
gcloud alpha monitoring policies create \
    --policy-from-file=monitoring/memory-alert.yaml

# 錯誤率告警
gcloud alpha monitoring policies create \
    --policy-from-file=monitoring/error-rate-alert.yaml
```

#### 自定義指標
```javascript
// 在應用中添加自定義指標
const { Monitoring } = require('@google-cloud/monitoring');
const monitoring = new Monitoring.MetricServiceClient();

// 記錄驗證成功率
async function recordVerificationSuccess(level) {
  const request = {
    name: monitoring.projectPath(PROJECT_ID),
    timeSeries: [{
      metric: {
        type: 'custom.googleapis.com/verification/success_rate',
        labels: { level: level.toString() }
      },
      points: [{
        interval: { endTime: { seconds: Date.now() / 1000 } },
        value: { doubleValue: 1 }
      }]
    }]
  };
  
  await monitoring.createTimeSeries(request);
}
```

### 2. 日誌管理

#### 結構化日誌配置
```javascript
// winston 配置
const winston = require('winston');
const { LoggingWinston } = require('@google-cloud/logging-winston');

const logger = winston.createLogger({
  level: 'info',
  format: winston.format.combine(
    winston.format.timestamp(),
    winston.format.errors({ stack: true }),
    winston.format.json()
  ),
  transports: [
    new LoggingWinston({
      projectId: process.env.PROJECT_ID,
      keyFilename: 'key.json'
    })
  ]
});
```

## 🔒 安全配置

### 1. 網絡安全

#### VPC 設置
```bash
# 創建 VPC 網絡
gcloud compute networks create twin-gate-vpc \
    --subnet-mode=custom

# 創建子網
gcloud compute networks subnets create twin-gate-subnet \
    --network=twin-gate-vpc \
    --range=10.0.0.0/24 \
    --region=asia-east1
```

#### 防火牆規則
```bash
# 允許 HTTPS 流量
gcloud compute firewall-rules create allow-https \
    --network=twin-gate-vpc \
    --allow=tcp:443 \
    --source-ranges=0.0.0.0/0

# 允許內部通信
gcloud compute firewall-rules create allow-internal \
    --network=twin-gate-vpc \
    --allow=tcp,udp,icmp \
    --source-ranges=10.0.0.0/24
```

### 2. 身份和訪問管理

#### 最小權限原則
```bash
# 為 Cloud Run 服務創建專用角色
gcloud iam roles create cloudRunService \
    --project=$PROJECT_ID \
    --title="Cloud Run Service Role" \
    --description="Minimal permissions for Cloud Run service" \
    --permissions="cloudsql.instances.connect,logging.logEntries.create"
```

### 3. 秘密管理

#### 使用 Secret Manager
```bash
# 創建秘密
echo -n "YOUR_BOT_TOKEN" | gcloud secrets create bot-token --data-file=-
echo -n "YOUR_API_KEY" | gcloud secrets create twin3-api-key --data-file=-

# 授予 Cloud Run 訪問權限
gcloud secrets add-iam-policy-binding bot-token \
    --member="serviceAccount:twin-gate-service@$PROJECT_ID.iam.gserviceaccount.com" \
    --role="roles/secretmanager.secretAccessor"
```

## 🔧 維護和更新

### 1. 滾動更新
```bash
# 零停機時間部署
gcloud run services replace service.yaml \
    --region=asia-east1
```

### 2. 回滾策略
```bash
# 查看修訂版本
gcloud run revisions list --service=twin-gate

# 回滾到特定版本
gcloud run services update-traffic twin-gate \
    --to-revisions=twin-gate-00001-abc=100
```

### 3. 備份策略
```bash
# 自動數據庫備份
gcloud sql backups create \
    --instance=twin-gate-db \
    --description="Manual backup before deployment"

# 設置自動備份
gcloud sql instances patch twin-gate-db \
    --backup-start-time=03:00 \
    --retained-backups-count=7
```

## 📈 性能優化

### 1. 自動擴展配置
```bash
# 設置自動擴展參數
gcloud run services update twin-gate \
    --min-instances=1 \
    --max-instances=100 \
    --concurrency=1000 \
    --cpu-throttling \
    --memory=1Gi
```

### 2. 連接池優化
```javascript
// Prisma 連接池配置
const prisma = new PrismaClient({
  datasources: {
    db: {
      url: process.env.DATABASE_URL + '?connection_limit=5&pool_timeout=20'
    }
  }
});
```

## 🆘 故障排除

### 常見問題和解決方案

#### 1. 部署失敗
```bash
# 檢查部署日誌
gcloud run services logs read twin-gate --region=asia-east1

# 檢查服務狀態
gcloud run services describe twin-gate --region=asia-east1
```

#### 2. 數據庫連接問題
```bash
# 測試數據庫連接
gcloud sql connect twin-gate-db --user=postgres

# 檢查 Cloud SQL 代理
gcloud sql instances describe twin-gate-db
```

#### 3. 性能問題
```bash
# 檢查資源使用情況
gcloud monitoring metrics list --filter="resource.type=cloud_run_revision"

# 調整資源配置
gcloud run services update twin-gate \
    --memory=2Gi \
    --cpu=2
```

---

**文檔版本**：v1.0.0 | **最後更新**：2025-01-26
