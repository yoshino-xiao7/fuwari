---
title: 二次元随机美图api
published: 2025-12-04T02:22:00
description: 把pixiv的图片信息存储在数据库中，并提供代理服务
image: ../assets/images/2025-12-04-01-36-18-image.png
tags:
  - api
category: 技术分享
draft: false
lang: ""
---

# 起因
一直以来总想根据自己的性趣去部署一个图片api，最近购置了阿里云服务器进行备案，就干脆把阿里云的服务器拿来搭建好了。

---
# API v2
[https://api.yukiryou.icu/setu/v2](https://www.pixiv.net/)

- **接口地址（GET / POST 通用）**

```

/setu/v2

```
- **返回格式：JSON**

---

# 请求参数说明

| 参数名           | 数据类型     | 默认值          | 描述                   |
| ------------- | -------- | ------------ | -------------------- |
| `r18`         | int      | 0            | 0 非 R18，1 R18，2 混合   |
| `num`         | int      | 1            | 返回数量，范围 1–20         |
| `uid`         | int[]    | 无            | 按作者 UID 过滤（最多 20 个）  |
| `keyword`     | string   | 无            | 标题 / 作者 / 标签模糊匹配     |
| `tag`         | string[] | 无            | 标签 AND / OR 组合匹配     |
| `size`        | string[] | ["original"] | 返回图片尺寸（可多选）          |
| `proxy`       | string   | i.pixiv.re   | 替换图片 URL 域名          |
| `dateAfter`   | long     | 无            | 上传时间 ≥ 此时间（毫秒）       |
| `dateBefore`  | long     | 无            | 上传时间 ≤ 此时间（毫秒）       |
| `dsc`         | boolean  | false        | 禁用自动缩写转换             |
| `excludeAI`   | boolean  | false        | 排除 AI 作品（aiType = 2） |
| `aspectRatio` | string   | 无            | 图片宽高比过滤              |

---

# 标签（tag）高级匹配规则

  

标签匹配支持 AND / OR 组合，大小写不敏感。

  

## AND 规则（数组之间）

例如：

  

```

tag=萝莉|少女

tag=黑丝|白丝

```

  

这代表：

  

```

(萝莉 OR 少女) AND (黑丝 OR 白丝)

```

  

## OR 规则（同一个字符串内用 `|` 分隔）

  

例如：

  

```

tag=巨乳|おっぱい

```

  

表示匹配其中任意一个即可。

  

## 匹配范围：

  

| 字段 | 是否参与匹配 |

|------|-------------|

| 标签（tags） | ✔ |

| 标题（title） | ✔ |

| 作者（author） | ✔ |

  

全部以 **小写** + **包含（contains）匹配**方式处理。

  

---

# GET 示例

  

## 1️⃣ 获取 1 个非 R18 的随机图（默认 original 尺寸）

```

GET https://api.yukiryou.icu/setu/v2

```

  

## 2️⃣ 获取 5 张 original + regular 尺寸图片

```

GET https://api.yukiryou.icu/setu/v2?num=5&size=original&size=regular

```

  

## 3️⃣ 标签高级匹配示例

```

GET https://api.yukiryou.icu/setu/v2?tag=萝莉|少女&tag=白丝|黑丝

```

  

即：

  

```

(萝莉 OR 少女) AND (白丝 OR 黑丝)

```

  

## 4️⃣ 按关键字模糊搜索

```

GET https://api.yukiryou.icu/setu/v2?keyword=碧蓝航线

```

  

## 5️⃣ 按作者 uid 搜索

```

GET https://api.yukiryou.icu/setu/v2?uid=12345&uid=67890

```

  

## 6️⃣ 限制长宽比

```

GET https://api.yukiryou.icu/setu/v2?aspectRatio=1.6-1.8

```

  

## 7️⃣ 过滤 AI 图

```

GET https://api.yukiryou.icu/setu/v2?excludeAI=true

```

  

---

  

# 📨 POST 示例

  

POST 支持 JSON 的二维 tag：

  

```json

{

  "num": 5,

  "r18": 0,

  "tag": [

    ["萝莉", "少女"],

    ["黑丝", "白丝"]

  ],

  "size": ["original", "regular", "small"],

  "excludeAI": false

}

```

  

就是：

  

```

tag=萝莉|少女

tag=黑丝|白丝

```

  

---

  

# 返回格式

  

示例：

  

```json

{

  "error": "",

  "data": [

    {

      "pid": 82675630,

      "p": 0,

      "uid": 8244461,

      "title": "水着ル・マラン",

      "author": "Vldjm13",

      "r18": false,

      "width": 3360,

      "height": 3960,

      "tags": ["アズールレーン","碧蓝航线","水着"],

      "ext": "png",

      "aiType": 0,

      "uploadDate": 1593535904000,

      "urls": {

        "original": "https://i.yukiryou.top/img-original/...png",

        "regular": "https://i.yukiryou.top/img-master/..._master1200.jpg",

        "small": "/c/540x540_70/img-master/..._master1200.jpg",

        "thumb": "/c/250x250_80_a2/img-master/..._square1200.jpg",

        "mini": "/c/48x48/img-master/..._square1200.jpg"

      }

    }

  ]

}

```
  

---

# 🔄 图片 URL 自动生成逻辑

你只需要 original，即：

    /img-original/.../90551655_p0.jpg

API 会自动生成：

| size     | URL 规则                                          |
|----------|---------------------------------------------------|
| original | `/img-original/.../90551655_p0.jpg`               |
| regular  | `/img-master/.../p0_master1200.jpg`               |
| small    | `/c/540x540_70/img-master/..._master1200.jpg`     |
| thumb    | `/c/250x250_80_a2/img-master/..._square1200.jpg`  |
| mini     | `/c/48x48/img-master/..._square1200.jpg`          |

---

# ⚠️ 注意事项

  

- num 最大为 20  

- original 为唯一保证存在的尺寸  

- PNG 原图不一定有 regular/small/thumb/mini  

- 标签大小写不敏感  

- tag 与 keyword 组合可能降低性能  

  
---

# 其他服务

[QQ Bot](https://yukiryou.icu/posts/api_plugin/)

后续可能优化一下并公开插件