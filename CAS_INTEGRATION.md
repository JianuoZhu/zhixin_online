# CAS Integration Preparation

## Current implementation

The backend keeps the existing password login and adds CAS endpoints:

- `GET /api/auth/cas/login`: redirects users to SUSTech CAS.
- `GET /api/auth/cas/callback`: validates the CAS `ticket`, maps the CAS user to an existing local user, then issues the app JWT. If no local user matches, it sends a short-lived registration token to the frontend.
- `POST /api/auth/cas/register`: creates a new local `member` account from the CAS registration token and user-supplied initial profile fields.
- `GET|POST /api/auth/cas/logout`: SLO notification endpoint reserved for CAS.

The frontend adds:

- A "使用学校 CAS 登录" button on the login page.
- `/cas/callback`, which stores the app JWT after backend CAS validation or asks the user whether to create a new account.

## Required production configuration

Set these backend environment variables before applying for school approval:

```env
FRONTEND_URL=https://<your-production-domain>
API_PUBLIC_BASE_URL=https://<your-production-api-domain>
CAS_SERVICE_URL=https://<your-production-api-domain>/api/auth/cas/callback
CAS_LOGIN_URL=https://cas.sustech.edu.cn/cas/login
CAS_LOGOUT_URL=https://cas.sustech.edu.cn/cas/logout
CAS_SERVICE_VALIDATE_URL=https://cas.sustech.edu.cn/cas/serviceValidate
```

The school requires HTTPS access. If the server uses Let's Encrypt, make sure the certificate chain includes the current Let's Encrypt R3 chain accepted by the campus CAS environment.

## User mapping rule

CAS returns:

- `user`: GUID
- `sid`: SUSTechID
- Optional `name`

CAS login succeeds immediately when an existing `users` row has either:

- `cas_guid` equal to CAS `user`, or
- `sustech_id` equal to CAS `sid`

If no local user matches, the frontend asks whether to create a new account. The new account is always created as `role=member`, with `cas_guid` and `sustech_id` bound from the CAS identity. The user fills initial fields such as display name and contact email.

Run the database upgrade once for an existing SQLite database:

```powershell
cd backend
python upgrade_db_v4.py
```

When importing users by CSV, optional columns are now supported:

```csv
email,password,role,display_name,sustech_id,cas_guid
student@example.com,ChangeMe123!,member,Student Name,12345678,
```

## Email draft

收件人：cas@sustech.edu.cn

抄送：所在部门负责人

邮件标题：CAS 系统授权新申请

邮件正文：

您好：

我们正在为“致新线上系统”申请接入学校 CAS 认证服务，烦请协助开通 CAS 系统授权。申请信息如下：

1. 申请人姓名及联系方式  
   申请人：<申请人姓名>  
   Email：<申请人邮箱>  
   电话：<申请人电话>

2. 应用使用 CAS 认证的场景  
   “致新线上系统”是面向致新书院师生/成员的线上服务平台，用于活动报名与签到、房间预约、公告通知、导师问答、个人日历及后台数据管理。用户访问系统时需要通过学校统一身份认证确认身份，系统根据本地已导入账号与 CAS 返回的 SUSTechID/GUID 进行匹配后登录。

3. 应用回调 URI 地址  
   https://<正式后端域名>/api/auth/cas/callback

4. 单点登出 SLO URL  
   https://<正式后端域名>/api/auth/cas/logout

5. 系统管理员联系方式  
   管理员：<系统管理员姓名>  
   Email：<系统管理员邮箱>  
   电话：<系统管理员电话>

6. 是否使用 OAuth  
   不使用 OAuth，使用 CAS 协议接入。

7. 申请获取的用户属性  
   CAS 返回的 `user` 作为 GUID 使用；申请获取 `sid`（SUSTechID，用户当前 SID）用于与系统内账号绑定；如可配置，也希望获取 `name`（姓名）用于系统界面显示。  
   不申请获取 email/cell 信息。

系统访问方式为 HTTPS。CAS 配置信息拟采用：  
认证地址：https://cas.sustech.edu.cn/cas/login  
注销地址：https://cas.sustech.edu.cn/cas/logout  
端口：443

谢谢！

<申请人姓名>  
<所在部门/书院>  
<日期>
