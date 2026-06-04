# 新服务器部署指南

本文档按 Ubuntu 22.04/24.04 + PostgreSQL + Nginx + systemd 编写。推荐生产架构：

- 代码目录：`/opt/zhixin-online-system`
- 运行用户：`zhixin`
- 前端：Nginx 直接托管 `frontend/dist`
- 后端：FastAPI 监听 `127.0.0.1:8000`，由 Nginx 反向代理 `/api/` 和 `/uploads/`
- 数据库：PostgreSQL
- 域名示例：`https://zhixin.example.edu.cn`

## 0. 部署前准备

请先准备好：

- 服务器公网 IP、SSH 账号、仓库地址。
- 已解析到服务器的正式域名，例如 `zhixin.example.edu.cn`。
- PostgreSQL 数据库密码。
- 后端 `SECRET_KEY`，可用 `openssl rand -hex 32` 生成。
- 管理员初始邮箱和密码。
- CAS 申请信息：回调地址为 `https://<你的域名>/api/auth/cas/callback`。

## 1. 安装系统依赖

```bash
sudo apt update
sudo apt install -y git curl nginx postgresql postgresql-client python3 python3-venv python3-pip
```

前端使用 Vite 7，Node.js 需要 20.19+ 或 22.12+。如果系统仓库里的 Node 版本较低，请安装 Node.js 22 LTS 后再继续：

```bash
node -v
npm -v
python3 --version
```

如果启用了防火墙：

```bash
sudo ufw allow OpenSSH
sudo ufw allow 'Nginx Full'
sudo ufw enable
```

## 2. 创建运行用户并拉取代码

```bash
sudo mkdir -p /opt/zhixin-online-system
sudo useradd --system --home-dir /opt/zhixin-online-system --shell /usr/sbin/nologin zhixin || true
sudo chown -R zhixin:www-data /opt/zhixin-online-system
sudo -u zhixin git clone <repo-url> /opt/zhixin-online-system
cd /opt/zhixin-online-system
```

如果目录已经存在并且不是空目录，改用：

```bash
cd /opt/zhixin-online-system
sudo -u zhixin git pull
```

## 3. 初始化 PostgreSQL

```bash
sudo -u postgres psql
```

在 `psql` 中执行，密码请替换成强密码：

```sql
CREATE USER zhixin WITH PASSWORD 'CHANGE_ME_DB_PASSWORD';
CREATE DATABASE zhixin OWNER zhixin;
\q
```

连接串将写入 `backend/.env`：

```env
DATABASE_URL=postgresql+psycopg2://zhixin:CHANGE_ME_DB_PASSWORD@127.0.0.1:5432/zhixin
```

如果你希望用 Docker 启 PostgreSQL，也可以使用仓库里的 `docker-compose.yml`：

```bash
POSTGRES_PASSWORD=CHANGE_ME_DB_PASSWORD docker compose up -d db
```

## 4. 配置环境变量

复制样例文件：

```bash
sudo -u zhixin cp backend/.env.example backend/.env
sudo -u zhixin cp frontend/.env.example frontend/.env
```

编辑 `backend/.env`，至少替换以下值：

```env
DATABASE_URL=postgresql+psycopg2://zhixin:CHANGE_ME_DB_PASSWORD@127.0.0.1:5432/zhixin
SECRET_KEY=CHANGE_ME_GENERATE_WITH_OPENSSL_RAND_HEX_32
ALLOWED_ORIGINS=https://zhixin.example.edu.cn
FRONTEND_URL=https://zhixin.example.edu.cn
API_PUBLIC_BASE_URL=https://zhixin.example.edu.cn
CAS_SERVICE_URL=https://zhixin.example.edu.cn/api/auth/cas/callback
ADMIN_EMAIL=admin@example.com
ADMIN_PASSWORD=CHANGE_ME_BOOTSTRAP_ADMIN_PASSWORD
```

编辑 `frontend/.env`：

```env
VITE_API_BASE_URL=https://zhixin.example.edu.cn
```

如果前后端使用不同域名：

- `frontend/.env` 的 `VITE_API_BASE_URL` 填后端域名。
- `backend/.env` 的 `ALLOWED_ORIGINS` 填前端域名。
- `FRONTEND_URL` 填前端域名。
- `API_PUBLIC_BASE_URL` 和 `CAS_SERVICE_URL` 填后端域名。

## 5. 一键准备后端依赖、数据库结构和前端构建

仓库已新增 `scripts/deploy.sh`，它会执行：

- 创建/更新 `backend/.venv`
- 安装 Python 依赖
- 初始化数据库表结构
- 创建管理员账号
- 执行 `npm ci`
- 构建 `frontend/dist`

运行：

```bash
sudo -u zhixin bash scripts/deploy.sh
```

默认不会写入演示数据。确实需要演示数据时再运行：

```bash
sudo -u zhixin RUN_SEED=1 bash scripts/deploy.sh
```

如果要重置管理员密码：

```bash
cd /opt/zhixin-online-system/backend
sudo -u zhixin .venv/bin/python scripts/create_admin.py --update-password
```

## 6. 配置 systemd 后端服务

仓库已新增模板：`deploy/systemd/zhixin-api.service`。

如果你的部署目录、用户或端口不同，请先编辑模板。默认配置为：

- 工作目录：`/opt/zhixin-online-system/backend`
- Python 虚拟环境：`/opt/zhixin-online-system/backend/.venv`
- 后端监听：`127.0.0.1:8000`
- Worker 数：`2`

安装并启动：

```bash
sudo cp deploy/systemd/zhixin-api.service /etc/systemd/system/zhixin-api.service
sudo systemctl daemon-reload
sudo systemctl enable --now zhixin-api
sudo systemctl status zhixin-api
```

查看日志：

```bash
sudo journalctl -u zhixin-api -f
```

## 7. 配置 Nginx

仓库已新增模板：`deploy/nginx/zhixin.conf`。先把其中的 `server_name` 替换成你的域名：

```nginx
server_name zhixin.example.edu.cn;
```

安装配置：

```bash
sudo cp deploy/nginx/zhixin.conf /etc/nginx/sites-available/zhixin
sudo ln -s /etc/nginx/sites-available/zhixin /etc/nginx/sites-enabled/zhixin
sudo nginx -t
sudo systemctl reload nginx
```

上传文件目录建议设置为后端用户可写：

```bash
sudo mkdir -p /opt/zhixin-online-system/backend/uploads
sudo chown -R zhixin:www-data /opt/zhixin-online-system/backend/uploads
sudo chmod -R 775 /opt/zhixin-online-system/backend/uploads
```

## 8. 启用 HTTPS

CAS 要求正式环境使用 HTTPS。使用 Certbot 时：

```bash
sudo apt install -y certbot python3-certbot-nginx
sudo certbot --nginx -d zhixin.example.edu.cn
sudo systemctl reload nginx
```

证书签发后，请确认：

- `https://zhixin.example.edu.cn` 可以打开前端。
- `https://zhixin.example.edu.cn/api/health` 返回 `{"status":"ok"}`。

## 9. CAS 配置与验收

给 CAS 管理方的生产地址：

- 应用回调 URI：`https://zhixin.example.edu.cn/api/auth/cas/callback`
- SLO URL：`https://zhixin.example.edu.cn/api/auth/cas/logout`
- 登录地址：`https://cas.sustech.edu.cn/cas/login`
- 登出地址：`https://cas.sustech.edu.cn/cas/logout`
- 校验地址：`https://cas.sustech.edu.cn/cas/serviceValidate`
- 需要属性：`sid`，可选 `name`

预绑定 CAS 用户时，准备 CSV：

```csv
email,sustech_id,cas_guid
student@example.com,12345678,
```

导入：

```bash
cd /opt/zhixin-online-system/backend
sudo -u zhixin .venv/bin/python scripts/import_cas_ids.py /path/to/users.csv
```

## 10. 冒烟测试

仓库已新增 `scripts/smoke-test.sh`：

```bash
API_URL=https://zhixin.example.edu.cn FRONTEND_URL=https://zhixin.example.edu.cn bash scripts/smoke-test.sh
```

手动检查：

- `https://zhixin.example.edu.cn/api/health`
- 前端登录页
- 管理员账号密码登录
- CAS 登录按钮
- CAS 回调后是否回到 `/cas/callback`
- 活动、公告、房间预约、导师问答、后台页面

## 11. 日常更新流程

```bash
cd /opt/zhixin-online-system
sudo -u zhixin git pull
sudo -u zhixin bash scripts/deploy.sh
sudo systemctl restart zhixin-api
sudo nginx -t
sudo systemctl reload nginx
```

如果只改了后端代码，一般仍建议运行 `scripts/deploy.sh`，它会确保依赖和前端构建状态一致。

## 12. 数据备份

仓库已新增 PostgreSQL 备份脚本：

```bash
cd /opt/zhixin-online-system
sudo -u zhixin bash scripts/backup-postgres.sh
```

默认输出到 `backups/`。也可以指定目录：

```bash
BACKUP_DIR=/var/backups/zhixin sudo -u zhixin bash scripts/backup-postgres.sh
```

建议用 crontab 每天备份一次，并把备份同步到服务器外部位置。

## 13. 回滚建议

发布前记录当前提交：

```bash
git rev-parse --short HEAD
```

如需回滚：

```bash
cd /opt/zhixin-online-system
sudo -u zhixin git checkout <previous-commit>
sudo -u zhixin bash scripts/deploy.sh
sudo systemctl restart zhixin-api
sudo systemctl reload nginx
```

如果涉及数据库结构变更，先恢复数据库备份，再回滚代码。

## 14. 本次已整合的部署优化

- 新增 `backend/.env.example` 和 `frontend/.env.example`，避免遗漏生产环境变量。
- 新增 `backend/scripts/init_db.py`，用于新数据库建表。
- 新增 `backend/scripts/create_admin.py`，生产环境可只创建管理员，不写入演示数据。
- 新增 `scripts/deploy.sh`，整合依赖安装、建表、管理员创建和前端构建。
- 新增 `scripts/smoke-test.sh`，快速检查 API 与前端。
- 新增 `scripts/backup-postgres.sh`，支持 PostgreSQL 备份。
- 新增 systemd 和 Nginx 模板。
- `backend/requirements.txt` 已补充 PostgreSQL 驱动。
- `docker-compose.yml` 已改为可配置数据库账号密码，并增加健康检查。
