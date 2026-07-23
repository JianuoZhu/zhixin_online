# 知新在线系统项目说明

## 1. 项目是做什么的

知新在线系统（`zhixin-online-system`）是一套面向书院、学院或校园社区的综合在线服务平台。它把活动管理、场地预约、公告通知、导师服务、树洞问答、个人日历和后台管理集中在同一个 Web 系统中。

系统主要服务三类用户：

- 普通成员：浏览和报名活动、签到、预约房间、阅读公告、发布问题、维护个人资料。
- 导师：维护导师资料、接收指定问题、参与问答。
- 管理员：管理用户和角色，审批活动及导师申请，维护活动、公告和房间，导入用户并导出报名、签到数据。

## 2. 主要功能

### 2.1 登录与用户

- 邮箱、密码登录。
- 南方科技大学 CAS 单点登录。
- 首次 CAS 登录时补充邮箱、姓名等资料并注册。
- JWT 访问令牌认证。
- 普通成员、导师、管理员三级权限控制。
- 用户资料和密码修改。
- 管理员批量导入用户、修改用户角色。

### 2.2 活动

- 查看活动列表和活动详情。
- 用户报名、取消报名。
- 用户创建活动，管理员审批。
- 活动签到及签到凭证图片上传。
- 查看个人报名、个人创建和个人签到记录。
- 管理员导出活动报名和签到 CSV。

### 2.3 房间预约

- 按日期查看房间和预约情况。
- 创建房间预约。
- 取消自己的预约。
- 查看个人预约记录。
- 管理员创建房间。

### 2.4 公告与通知

- 查看公告列表和详情。
- 标记公告已读。
- 管理员创建、编辑和删除公告。
- 通知页汇总公告、活动和问答信息。

### 2.5 导师与树洞问答

- 用户申请成为导师。
- 导师维护个人简介、专业、毕业年份和标签。
- 管理员审批或拒绝导师申请。
- 用户实名或匿名提问。
- 为问题指定导师。
- 发布回答并对回答投票。

### 2.6 个人日历和界面

- 创建和删除个人日历事项。
- 日历中汇总用户相关活动。
- 支持中文、英文界面切换。
- 支持亮色、暗色及跟随系统主题。
- 使用响应式页面适配不同尺寸的浏览器。

## 3. 系统如何实现

项目采用前后端分离的单仓库结构：

```text
浏览器
  │
  ├── 页面和静态资源 ──> React + Vite
  │
  └── /api、/uploads ──> Nginx ──> FastAPI ──> PostgreSQL
                                      │
                                      └── CAS 认证服务器
```

生产环境中，Nginx 直接提供前端构建产物，并把 `/api/` 和 `/uploads/` 请求转发给监听 `127.0.0.1:8000` 的 FastAPI 服务。FastAPI 使用 SQLAlchemy 访问 PostgreSQL，使用 systemd 保持后台服务运行。

### 3.1 前端技术

| 技术 | 用途 |
| --- | --- |
| React 19 | 构建页面和组件 |
| TypeScript | 类型检查和前端数据结构 |
| Vite 7 | 本地开发和生产构建 |
| React Router 7 | 页面路由 |
| Tailwind CSS、Flowbite React | 页面样式和 UI 组件 |
| React Context | 登录状态、主题、语言和提示消息 |

前端通过 `fetch` 调用后端 REST API。登录令牌由认证上下文维护，请求客户端统一添加 `Authorization: Bearer <token>`。

### 3.2 后端技术

| 技术 | 用途 |
| --- | --- |
| FastAPI | REST API 和 OpenAPI 文档 |
| Uvicorn | ASGI 应用服务器 |
| SQLAlchemy 2 | 数据模型和数据库访问 |
| PostgreSQL / psycopg2 | 生产数据库 |
| Pydantic Settings | 环境变量配置 |
| python-jose | JWT 签发和校验 |
| Passlib、bcrypt | 密码哈希和校验 |
| CAS serviceValidate | 校园统一身份认证 |

后端按业务拆分为多个 Router。每次请求通过依赖注入获得数据库会话和当前用户，需要管理权限的接口再通过角色依赖进行限制。

### 3.3 主要数据

核心数据模型包括：

- `User`：用户、角色、CAS 标识和个人资料。
- `Event`、`EventRegistration`、`EventCheckin`：活动、报名和签到。
- `Room`、`RoomBooking`：房间和预约。
- `Announcement`、`AnnouncementRead`：公告和已读记录。
- `MentorProfile`：导师资料和审批状态。
- `QaQuestion`、`QaAnswer`、`AnswerVote`：问题、回答和投票。
- `QaQuestionMentor`：问题与导师的关联。
- `CalendarItem`：个人日历事项。

## 4. 代码在哪里

### 4.1 仓库结构

```text
zhixin-online-system/
├── frontend/                  # React 前端
├── backend/                   # FastAPI 后端
├── deploy/                    # Nginx 和 systemd 模板
├── scripts/                   # 部署、冒烟测试和备份脚本
├── docker-compose.yml         # 本地 PostgreSQL
├── README.md                  # 快速启动说明
└── DEPLOYMENT_CHECKLIST.md    # 原有部署检查清单
```

### 4.2 前端代码位置

| 内容 | 位置 |
| --- | --- |
| 应用入口 | `frontend/src/main.tsx` |
| 路由和受保护页面布局 | `frontend/src/App.tsx` |
| API 请求封装 | `frontend/src/api/client.ts` |
| 登录状态和令牌 | `frontend/src/context/AuthContext.tsx` |
| 主题、语言、消息提示 | `frontend/src/context/` |
| 页面 | `frontend/src/pages/` |
| 通用组件 | `frontend/src/components/` |
| 管理后台弹窗组件 | `frontend/src/components/admin/` |
| 前端类型 | `frontend/src/types.ts` |
| 中英文文案 | `frontend/src/i18n/translations.ts` |
| 全局样式 | `frontend/src/index.css` |
| Vite 配置 | `frontend/vite.config.ts` |
| 前端依赖和命令 | `frontend/package.json` |

主要页面对应关系：

| 页面 | 文件 |
| --- | --- |
| 登录、CAS 回调 | `Login.tsx`、`CasCallback.tsx` |
| 首页 | `Dashboard.tsx` |
| 活动 | `Events.tsx` |
| 房间预约 | `RoomBooking.tsx` |
| 公告 | `Announcements.tsx` |
| 导师和树洞 | `MentorTreeHole.tsx` |
| 日历 | `UserCalendar.tsx` |
| 个人资料 | `Profile.tsx` |
| 通知 | `Notifications.tsx` |
| 管理后台 | `Admin.tsx` |

### 4.3 后端代码位置

| 内容 | 位置 |
| --- | --- |
| FastAPI 应用入口 | `backend/app/main.py` |
| 环境变量配置 | `backend/app/core/config.py` |
| 数据库连接 | `backend/app/database.py` |
| SQLAlchemy 数据模型 | `backend/app/models.py` |
| API 输入输出模型 | `backend/app/schemas.py` |
| 数据库和权限依赖 | `backend/app/dependencies.py` |
| JWT 和密码安全 | `backend/app/core/security.py` |
| CAS 协议处理 | `backend/app/core/cas.py` |
| 各业务 API | `backend/app/routers/` |
| 初始化数据库 | `backend/scripts/init_db.py` |
| 创建管理员 | `backend/scripts/create_admin.py` |
| 导入 CAS 标识 | `backend/scripts/import_cas_ids.py` |
| 演示数据 | `backend/scripts/seed.py` |
| Python 依赖 | `backend/requirements.txt` |

后端 Router 对应关系：

| API 前缀 | 文件 | 业务 |
| --- | --- | --- |
| `/api/auth` | `auth.py` | 密码登录、CAS 登录、当前用户 |
| `/api/users` | `users.py` | 用户、角色、资料和导入 |
| `/api/events` | `events.py` | 活动、报名、审批和签到 |
| `/api/checkins` | `checkins.py` | 签到记录 |
| `/api/rooms` | `rooms.py` | 房间和预约 |
| `/api/announcements` | `announcements.py` | 公告和已读 |
| `/api/mentors` | `mentors.py` | 导师申请、资料和审批 |
| `/api/qa` | `qa.py` | 问题、回答和投票 |
| `/api/calendar` | `calendar.py` | 个人日历 |
| `/api/export` | `export.py` | CSV 导出 |

### 4.4 部署代码位置

| 内容 | 位置 |
| --- | --- |
| 一键准备和构建 | `scripts/deploy.sh` |
| 线上冒烟测试 | `scripts/smoke-test.sh` |
| PostgreSQL 备份 | `scripts/backup-postgres.sh` |
| systemd 服务模板 | `deploy/systemd/zhixin-api.service` |
| Nginx 配置模板 | `deploy/nginx/zhixin.conf` |
| PostgreSQL Docker 配置 | `docker-compose.yml` |
| 后端环境变量示例 | `backend/.env.example` |
| 前端环境变量示例 | `frontend/.env.example` |

## 5. 本地开发方式

启动 PostgreSQL：

```bash
docker compose up -d db
```

启动后端：

```bash
cd backend
python -m venv .venv
source .venv/bin/activate
pip install -r requirements.txt
cp .env.example .env
python scripts/init_db.py
python scripts/create_admin.py
uvicorn app.main:app --reload
```

Windows PowerShell 激活虚拟环境时使用：

```powershell
.\.venv\Scripts\Activate.ps1
```

启动前端：

```bash
cd frontend
npm install
npm run dev
```

默认开发地址：

- 前端：`http://localhost:5173`
- 后端：`http://localhost:8000`
- API 文档：`http://localhost:8000/docs`
- 健康检查：`http://localhost:8000/api/health`

