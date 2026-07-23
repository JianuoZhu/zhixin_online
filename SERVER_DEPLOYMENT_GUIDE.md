# 知新在线系统服务器部署教程

## 1. 部署方案

本文使用以下生产架构：

```text
用户浏览器
    │ HTTPS 443
    ▼
Nginx
    ├── /             -> frontend/dist
    ├── /api/         -> FastAPI 127.0.0.1:8000
    └── /uploads/     -> FastAPI 127.0.0.1:8000
                           │
                           ▼
                       PostgreSQL
```

推荐环境：

- Ubuntu 22.04 或 24.04。
- Node.js 22 LTS。
- Python 3.10 以上。
- PostgreSQL 16。
- Nginx、systemd、Certbot。
- 代码目录：`/opt/zhixin-online-system`。
- 运行用户：`zhixin`。

仓库当前生产模板使用：

- 域名：`zhixinc.org`。
- 服务器 IP：`47.115.169.85`。
- 后端端口：`127.0.0.1:8000`。

如果实际域名、IP、目录或用户不同，需要同步修改环境变量、Nginx 和 systemd 模板。

## 2. 部署前准备

准备以下信息：

- 服务器 SSH 地址和具有 `sudo` 权限的账号。
- GitHub 仓库访问权限。
- 正式域名及其 DNS 管理权限。
- PostgreSQL 强密码。
- 初始管理员邮箱和强密码。
- CAS 管理方确认的回调地址。

服务器安全组只需开放：

| 端口 | 用途 |
| --- | --- |
| 22/TCP | SSH |
| 80/TCP | HTTP 和证书签发 |
| 443/TCP | HTTPS |

不要把 PostgreSQL 的 `5432` 端口开放到公网。

## 3. 配置 DNS

在域名服务商添加 A 记录：

```text
主机记录    类型    记录值
@           A       47.115.169.85
www         A       47.115.169.85
```

如果不使用 `www.zhixinc.org`，可以只配置 `@`。

等待解析生效：

```bash
dig +short zhixinc.org @1.1.1.1
```

返回值必须是目标服务器公网 IP。DNS 未生效前不要申请 HTTPS 证书，也不要进行 CAS 正式回调测试。

## 4. 安装系统依赖

SSH 登录服务器：

```bash
ssh <服务器用户>@47.115.169.85
```

安装基础依赖：

```bash
sudo apt update
sudo apt install -y \
  git curl nginx \
  postgresql postgresql-client \
  python3 python3-venv python3-pip
```

安装 Node.js 22 LTS。安装完成后检查版本：

```bash
node -v
npm -v
python3 --version
psql --version
nginx -v
```

Vite 7 至少需要 Node.js 20.19 或 22.12，生产服务器推荐直接使用 Node.js 22 LTS。

如果使用 UFW：

```bash
sudo ufw allow OpenSSH
sudo ufw allow 'Nginx Full'
sudo ufw enable
sudo ufw status
```

## 5. 创建运行用户并拉取代码

```bash
sudo mkdir -p /opt/zhixin-online-system

sudo useradd \
  --system \
  --home-dir /opt/zhixin-online-system \
  --shell /usr/sbin/nologin \
  zhixin || true

sudo chown -R zhixin:www-data /opt/zhixin-online-system
```

通过 HTTPS 或 SSH 克隆仓库：

```bash
sudo -u zhixin git clone \
  https://github.com/JianuoZhu/zhixin_online.git \
  /opt/zhixin-online-system

cd /opt/zhixin-online-system
```

私有仓库建议使用只读 Deploy Key，不要把个人访问令牌写进脚本或远程地址。

如果目录中已经存在仓库：

```bash
cd /opt/zhixin-online-system
sudo -u zhixin git pull --ff-only
```

## 6. 创建 PostgreSQL 数据库

进入 PostgreSQL 控制台：

```bash
sudo -u postgres psql
```

执行以下 SQL，并替换密码：

```sql
CREATE USER zhixin WITH PASSWORD 'CHANGE_ME_STRONG_DB_PASSWORD';
CREATE DATABASE zhixin OWNER zhixin;
\q
```

验证连接：

```bash
psql \
  "postgresql://zhixin:CHANGE_ME_STRONG_DB_PASSWORD@127.0.0.1:5432/zhixin" \
  -c "SELECT 1;"
```

生产环境推荐使用系统 PostgreSQL。仓库的 `docker-compose.yml` 主要用于本地开发；如果生产环境使用 Docker PostgreSQL，必须设置强密码并限制宿主机 `5432` 端口。

## 7. 配置后端环境变量

复制示例配置：

```bash
cd /opt/zhixin-online-system
sudo -u zhixin cp backend/.env.example backend/.env
```

生成 JWT 密钥：

```bash
openssl rand -hex 32
```

编辑配置：

```bash
sudo -u zhixin nano backend/.env
```

生产示例：

```env
DATABASE_URL=postgresql+psycopg2://zhixin:CHANGE_ME_STRONG_DB_PASSWORD@127.0.0.1:5432/zhixin
SECRET_KEY=CHANGE_ME_GENERATED_RANDOM_SECRET
ACCESS_TOKEN_EXPIRE_MINUTES=120

ALLOWED_ORIGINS=https://zhixinc.org
FRONTEND_URL=https://zhixinc.org
API_PUBLIC_BASE_URL=https://zhixinc.org

CAS_LOGIN_URL=https://cas.sustech.edu.cn/cas/login
CAS_LOGOUT_URL=https://cas.sustech.edu.cn/cas/logout
CAS_SERVICE_VALIDATE_URL=https://cas.sustech.edu.cn/cas/serviceValidate
CAS_SERVICE_URL=https://zhixinc.org/api/auth/cas/callback

ADMIN_EMAIL=CHANGE_ME_ADMIN_EMAIL
ADMIN_PASSWORD=CHANGE_ME_STRONG_ADMIN_PASSWORD
MAX_UPLOAD_SIZE=5242880
```

注意：

- 数据库密码如果包含 `@`、`:`、`/`、`#` 等字符，需要进行 URL 编码。
- `SECRET_KEY` 和管理员密码不能保留示例值。
- 多个 CORS 来源使用逗号分隔，不要在正式环境使用任意来源。
- 真实 `.env` 不能提交到 Git。

限制配置文件权限：

```bash
sudo chown zhixin:zhixin backend/.env
sudo chmod 600 backend/.env
```

## 8. 配置前端环境变量

```bash
cd /opt/zhixin-online-system
sudo -u zhixin cp frontend/.env.example frontend/.env
sudo -u zhixin nano frontend/.env
```

同域名部署时填写：

```env
VITE_API_BASE_URL=https://zhixinc.org
```

限制权限：

```bash
sudo chown zhixin:zhixin frontend/.env
sudo chmod 600 frontend/.env
```

`VITE_` 变量会在构建时写入前端产物。修改它以后必须重新运行前端构建。

## 9. 初始化后端并构建前端

仓库提供了一键脚本：

```bash
cd /opt/zhixin-online-system
sudo -u zhixin bash scripts/deploy.sh
```

脚本会：

1. 创建或更新 `backend/.venv`。
2. 安装 `backend/requirements.txt`。
3. 创建上传目录。
4. 初始化数据库表。
5. 确保初始管理员存在。
6. 执行 `npm ci`。
7. 生成 `frontend/dist`。

生产环境默认不要写入演示数据。只有演示服务器需要时才执行：

```bash
sudo -u zhixin RUN_SEED=1 bash scripts/deploy.sh
```

如果管理员已经存在，普通部署不会重置其密码。确实需要使用 `.env` 中的密码重置时：

```bash
cd /opt/zhixin-online-system/backend
sudo -u zhixin \
  .venv/bin/python scripts/create_admin.py --update-password
```

## 10. 安装 systemd 后端服务

复制服务模板：

```bash
cd /opt/zhixin-online-system
sudo cp \
  deploy/systemd/zhixin-api.service \
  /etc/systemd/system/zhixin-api.service
```

启用并启动：

```bash
sudo systemctl daemon-reload
sudo systemctl enable --now zhixin-api
sudo systemctl status zhixin-api
```

检查后端是否监听本机端口：

```bash
curl -fsS http://127.0.0.1:8000/api/health
sudo ss -lntp | grep 8000
```

正确响应：

```json
{"status":"ok"}
```

查看日志：

```bash
sudo journalctl -u zhixin-api -n 100 --no-pager
sudo journalctl -u zhixin-api -f
```

## 11. 配置上传目录

```bash
sudo mkdir -p /opt/zhixin-online-system/backend/uploads
sudo chown -R zhixin:www-data \
  /opt/zhixin-online-system/backend/uploads
sudo chmod -R 775 \
  /opt/zhixin-online-system/backend/uploads
```

签到图片保存在这个目录中。数据库备份不会自动包含这些文件。

## 12. 配置 Nginx

复制模板并启用站点：

```bash
cd /opt/zhixin-online-system

sudo cp \
  deploy/nginx/zhixin.conf \
  /etc/nginx/sites-available/zhixin

sudo ln -sfn \
  /etc/nginx/sites-available/zhixin \
  /etc/nginx/sites-enabled/zhixin
```

如有需要，禁用 Ubuntu 默认站点：

```bash
sudo unlink /etc/nginx/sites-enabled/default
```

检查并重载：

```bash
sudo nginx -t
sudo systemctl reload nginx
```

验证 HTTP：

```bash
curl -fsS http://47.115.169.85/api/health
curl -I http://47.115.169.85/
```

如果 API 返回 `502 Bad Gateway`，先检查：

```bash
sudo systemctl status zhixin-api
sudo journalctl -u zhixin-api -n 100 --no-pager
curl -v http://127.0.0.1:8000/api/health
sudo tail -n 100 /var/log/nginx/error.log
```

只有本机 `127.0.0.1:8000` 健康后，Nginx 反向代理才可能正常。

## 13. 配置 HTTPS

先确认域名已经解析到服务器：

```bash
dig +short zhixinc.org @1.1.1.1
```

安装 Certbot：

```bash
sudo apt install -y certbot python3-certbot-nginx
```

只为主域名申请证书：

```bash
sudo certbot --nginx -d zhixinc.org
```

如果 `www` 也已配置 DNS：

```bash
sudo certbot --nginx \
  -d zhixinc.org \
  -d www.zhixinc.org
```

验证证书自动续期：

```bash
sudo certbot renew --dry-run
```

最终检查：

```bash
curl -fsS https://zhixinc.org/api/health
curl -I https://zhixinc.org/
```

## 14. 配置和验证 CAS

向 CAS 管理方提供：

```text
应用回调 URI：https://zhixinc.org/api/auth/cas/callback
单点登出 URL：https://zhixinc.org/api/auth/cas/logout
登录地址：https://cas.sustech.edu.cn/cas/login
登出地址：https://cas.sustech.edu.cn/cas/logout
校验地址：https://cas.sustech.edu.cn/cas/serviceValidate
需要属性：sid
可选属性：name
```

预绑定 CAS 用户时，可以准备 CSV：

```csv
email,sustech_id,cas_guid
student@example.com,12345678,
```

导入：

```bash
cd /opt/zhixin-online-system/backend
sudo -u zhixin \
  .venv/bin/python scripts/import_cas_ids.py /path/to/users.csv
```

CAS 正式登录必须使用 HTTPS 域名，不要使用服务器 IP 测试回调。

## 15. 上线验收

运行自动冒烟测试：

```bash
cd /opt/zhixin-online-system

API_URL=https://zhixinc.org \
FRONTEND_URL=https://zhixinc.org \
bash scripts/smoke-test.sh
```

再进行人工检查：

- 首页、登录页和静态资源能正常加载。
- 管理员密码登录正常。
- CAS 登录、首次注册和回调正常。
- 普通成员不能访问管理员接口。
- 活动创建、审批、报名、取消和签到正常。
- 签到图片可以上传并显示。
- 房间预约和取消正常。
- 公告发布和已读状态正常。
- 导师申请、审批、问答和投票正常。
- 用户 CSV 导入以及报名、签到 CSV 导出正常。
- 手机端和桌面端页面均可使用。

## 16. 日常发布

每次发布前先记录当前提交：

```bash
cd /opt/zhixin-online-system
git rev-parse --short HEAD
```

更新代码：

```bash
cd /opt/zhixin-online-system
sudo -u zhixin git pull --ff-only
sudo -u zhixin bash scripts/deploy.sh
sudo systemctl restart zhixin-api
sudo nginx -t
sudo systemctl reload nginx
```

发布后运行：

```bash
API_URL=https://zhixinc.org \
FRONTEND_URL=https://zhixinc.org \
bash scripts/smoke-test.sh
```

## 17. 备份

备份 PostgreSQL：

```bash
cd /opt/zhixin-online-system
sudo mkdir -p /var/backups/zhixin
sudo chown zhixin:zhixin /var/backups/zhixin

BACKUP_DIR=/var/backups/zhixin \
sudo -u zhixin bash scripts/backup-postgres.sh
```

同时备份上传文件：

```bash
sudo tar -czf \
  /var/backups/zhixin/uploads-$(date +%Y%m%d-%H%M%S).tar.gz \
  -C /opt/zhixin-online-system/backend uploads
```

至少每天备份一次，并把数据库和上传文件同步到服务器之外。只保存在同一台服务器上的备份无法应对磁盘损坏或整机故障。

## 18. 回滚

代码回滚前先备份数据库和上传文件，然后切换到上一个已验证提交：

```bash
cd /opt/zhixin-online-system
sudo -u zhixin git fetch origin
sudo -u zhixin git checkout <previous-commit>
sudo -u zhixin bash scripts/deploy.sh
sudo systemctl restart zhixin-api
sudo nginx -t
sudo systemctl reload nginx
```

如果发布包含数据库结构变化，不能只回滚代码；必须使用与该版本匹配的迁移或数据库备份。

## 19. 常用排障命令

```bash
# 后端服务
sudo systemctl status zhixin-api
sudo journalctl -u zhixin-api -n 100 --no-pager

# Nginx
sudo nginx -t
sudo systemctl status nginx
sudo tail -n 100 /var/log/nginx/error.log

# PostgreSQL
sudo systemctl status postgresql
sudo -u postgres psql -c "\l"

# 端口
sudo ss -lntp

# 磁盘
df -h
du -sh /opt/zhixin-online-system/backend/uploads

# HTTPS
sudo certbot certificates

# 应用健康
curl -v http://127.0.0.1:8000/api/health
curl -v https://zhixinc.org/api/health
```

