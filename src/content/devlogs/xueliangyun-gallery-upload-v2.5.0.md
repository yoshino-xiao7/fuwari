---
title: "雪涼云 setu-api 2.5.0 图库投稿更新日志"
published: 2026-06-10T21:00:00
project: "xueliangyun"
summary: "雪涼云 setu-api 2.5.0 完成图库投稿链路升级，新增用户批量投稿、OSS 直传、人工审核、发布入库、投稿记录查询与管理端审核能力。"
---

## 更新概述

本次更新围绕 **图库投稿** 做了一次比较完整的链路升级。

过去图库内容主要依赖管理员在后台维护，普通用户无法直接参与图片补充。`setu-api 2.5.0` 将这条流程扩展为用户投稿、OSS 直传、人工审核、发布入库的完整闭环。用户可以在控制台提交图片批次，管理员在后台审核后决定发布或拒绝，发布后的投稿图片可以继续通过 `/setu/v2` 查询。

对应入口：

- 用户端：`/dashboard/gallery-upload`
- 管理端：`/admin/gallery-submissions`

---

## 用户侧图库投稿

### 批量选择与本地校验

用户现在可以在控制台直接发起图库投稿。前端支持单批次选择多张 `JPG/PNG` 图片，并在上传前完成基础校验：

- 单批次最多 `20` 张图片。
- 单张图片最大 `10MB`。
- 单批次总大小最大 `100MB`。

这些限制会先在前端拦截，后端仍然会进行最终校验，避免异常请求绕过客户端规则。

### 两种投稿模式

为了兼容不同类型的图片整理方式，本次新增两种投稿模式：

- `MULTI_PID_P0`：多张图片分别发布为独立 `pid`，每张图片的 `p` 固定为 `0`。
- `SINGLE_PID_MULTI_PAGE`：同一批次共享一个 `pid`，每张图片使用独立 `pageIndex`。

前一种适合互不关联的多图投稿，后一种适合组图、系列图或需要按页组织的投稿。

### 批次信息与单图覆盖

投稿时可以填写批次默认信息，也可以对单张图片进行覆盖：

- 批次默认信息：标题、作者、R18、AI 类型、标签。
- 单图覆盖信息：页码、标题、作者、标签。

这样可以减少重复填写，同时保留对单张图片精细调整的空间。

---

## OSS 直传链路

本次上传不再让前端文件经过业务服务器中转，而是使用后端下发的 STS 凭证直传 OSS。

流程如下：

1. 前端初始化投稿批次。
2. 后端返回临时凭证、上传策略和每张图片对应的 `objectKey`。
3. 前端使用 `ali-oss` 将图片上传到 `setu-pending`。
4. 上传完成后收集 `submissionId`、`objectKey`、`etag`、`sha256`。
5. 所有文件上传成功后调用 complete 接口。
6. 批次进入 `WAITING_MANUAL_REVIEW`，等待管理员审核。

这条链路的重点是：**前端不再自行拼接 OSS object key**，所有上传路径完全以服务端返回值为准，避免前后端规则不一致。

前端也会尝试计算 SHA-256，方便用户侧感知上传内容；后端在 complete 阶段仍会基于 OSS 文件重新校验，作为最终可信结果。

---

## 投稿记录与取消

用户侧新增“我的投稿”能力：

- 支持按投稿状态筛选。
- 支持分页查看历史投稿批次。
- 支持打开批次详情。
- 支持查看每张投稿图片的预览、页码、大小、标签和审核结果。
- 支持查看发布后的 public `pid` / `p`。
- 支持查看审核拒绝原因。

对于仍处于 `UPLOADING` 或 `WAITING_MANUAL_REVIEW` 的批次，用户可以主动取消投稿。

---

## 管理端投稿审核

管理端新增“投稿审核”入口，管理员可以按状态筛选投稿批次，并进入详情页查看待审图片。

审核通过时支持：

- 填写审核备注。
- 选择是否立即发布。
- 统一覆盖 R18。
- 统一覆盖 AI 类型。
- 统一规范化标签。

审核拒绝时支持：

- 填写必填拒绝原因。
- 选择拒绝严重程度。
- 触发待审 OSS 文件清理。

对于“拒绝成功但 OSS 清理失败”的情况，管理端会明确展示 `REJECT_DELETE_FAILED` 状态，方便后续人工处理。

---

## `/setu/v2` 来源查询扩展

发布后的用户投稿会进入正式图库，并可以通过 `/setu/v2` 查询。

新增来源参数示例：

```text
/setu/v2?num=5&source=yukiryou
/setu/v2?num=5&source=pixiv
/setu/v2?num=5&source=all
```

其中：

- `source=yukiryou`：仅查询用户投稿来源。
- `source=pixiv`：仅查询 Pixiv 来源。
- `source=all`：同时查询 Pixiv 与用户投稿来源。

用户投稿发布后的图片 URL 会走正式图库地址，返回结构保持与原有 Pixiv 来源兼容。

---

## 前端实现记录

新增文件：

- `src/api/galleryUpload.ts`：图库投稿 API、DTO、SHA-256 计算和 OSS 上传封装。
- `src/views/dashboard/GalleryUpload.vue`：用户端投稿、我的投稿和投稿详情页面。
- `src/admin/GallerySubmissionReview.vue`：管理端投稿审核页面。
- `src/utils/galleryUploadStatus.ts`：投稿状态、模式、标签与文件大小展示工具。

修改文件：

- `src/router/index.ts`：新增用户端与管理端路由。
- `src/layouts/UserLayout.vue`：新增“图库投稿”菜单入口。
- `src/layouts/AdminLayout.vue`：新增“投稿审核”菜单入口。
- `vite.config.ts`：将 `ali-oss` 及相关依赖拆分到 `vendor-oss`，降低业务路由首屏负担。
- `package.json` / `package-lock.json`：新增 `ali-oss` 依赖。

补充修复：

- 修复移动端点击“选择投稿图片”无反应的问题。
- 图片删除申请页面增加请求取消兜底和图片 fallback，减少快速切换或坏缩略图导致的持续加载状态。

---

## 认证与签名

新增的 `/gallery/**` 与 `/admin/**` 接口继续沿用现有登录态与请求签名机制：

- 登录态通过 HttpOnly `SID` Cookie 携带。
- 前端基于 `signSecret` 生成 `X-Timestamp`、`X-Nonce` 和 `X-Signature`。
- 签名 URI 只使用 path，不包含 query string。

现有 `src/api/http.ts` 已覆盖该规则，因此图库投稿相关 API 统一走请求拦截器完成签名。

---

## 注意事项

### OSS CORS

如果直传时报 `403`，或前端无法读取 `ETag`，优先检查 OSS CORS 配置：

- 是否允许当前前端域名。
- 是否允许 `PUT`。
- 是否允许 `Content-Type` 请求头。
- 是否暴露 `ETag` 响应头。

拿不到 `ETag` 不会阻塞 complete，但会降低前端侧的可观测性。

### STS 有效期

上传必须在后端返回的 STS 凭证有效期内完成。大批量图片、弱网环境或移动端后台切换时，可能触发 STS 过期，需要重新初始化投稿批次。

### 预览 URL

投稿详情中的 `previewUrl` 是短期地址。预览失效后重新请求详情即可，不应在前端长期缓存。

### 上传 SDK 体积

`ali-oss` 构建后体积较大，因此前端已通过动态导入和 `vendor-oss` 分包处理，只有进入上传流程时才会加载相关代码。

---

## 验证记录

本次前端已通过：

```bash
npm run lint
npm run typecheck
npm run build
npm run check:build-budget
```

本地路由冒烟：

- `/dashboard/gallery-upload` 返回正常。
- `/admin/gallery-submissions` 返回正常。

---

## 小结

`setu-api 2.5.0` 的重点不是单纯加一个上传按钮，而是把图库内容的生产流程从“管理员单点维护”推进到“用户参与、后台审核、正式发布”的闭环。

这为后续继续扩展图库生态打下了基础：用户能更方便地贡献图片，管理员也能在可控流程中审核、发布和追踪结果。

::github{repo="yoshino-xiao7/setu_cloud"}
