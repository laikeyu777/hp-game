# 虎扑云端排行榜接口契约

## 目的与边界

本契约描述《一指登塔：灰烬回廊》排行榜所需的云端 HTTP 接口，不绑定具体云厂商、函数运行时或域名。前端通过虎扑提供的云端请求适配器调用接口；适配器负责平台会话鉴权，客户端不得手写 Bearer token。

云端只保存排行榜必要字段。账号稳定标识由服务端从已验证会话中取得，仅用于归属和去重，绝不返回给客户端或渲染到页面；不得上传手机号、设备信息、完整存档或浏览记录。 Client must not send account ID; the server derives account identity from the verified session.

## 通用约定

- `Content-Type: application/json` 用于 POST 请求。
- 所有时间使用 Unix 毫秒或 ISO 8601；本项目提交使用 `durationMs`（非负整数）。
- `scope` 只能是 `all`（历史总榜）或 `daily`（每日挑战榜）。`daily` 必须同时提供当天有效的 challenge code（挑战码）。
- 榜单默认按 `score` 降序、`durationMs` 升序、`submittedAt` 升序排序。
- `limit` 为正整数，默认 50，服务端强制上限 50；服务端返回的 `rank` 是最终排名。
- The unique key is `accountKey + scopeKey` for each account and leaderboard scope: historical uses `all`, daily uses `daily:<challengeCode>`. Duplicate submissions retain only the better score.

## GET /api/leaderboard/list

读取公开榜单。无需客户端传入账号标识。

查询参数：

```text
scope=daily|all       必填
code=<challenge-code> daily 必填，all 忽略
limit=<1..50>         可选，默认 50
cursor=<opaque>       可选，下一页游标
```

响应 `200`：

```json
{
  "entries": [
    {
      "rank": 1,
      "nickname": "灰烬旅人",
      "score": 12840,
      "completedFloors": 50,
      "durationMs": 286000,
      "weapon": "staff"
    }
  ],
  "nextCursor": null
}
```

`entries` 每项只能包含公开展示所需字段（可选 `submittedAt` 供同分排序展示策略使用）；不得包含 `puid`、`userId`、手机号、设备字段、提交键或完整存档。

## GET /api/leaderboard/me

读取当前已登录虎扑用户在指定榜单的最佳成绩。账号身份从会话取得，不接受 `accountId`、`puid` 或类似参数。

查询参数与 `list` 相同（`scope` 必填，`daily` 时 `code` 必填）。

响应 `200`：

```json
{
  "entry": {
    "rank": 7,
    "nickname": "灰烬旅人",
    "score": 9320,
    "completedFloors": 38,
    "durationMs": 241000,
    "weapon": "sword"
  }
}
```

未登录时返回 `401 NOT_LOGGED_IN`；已登录但该榜单暂无成绩时返回 `200` 且 `entry: null`。

## POST /api/leaderboard/submit

提交一次普通冒险或每日挑战成绩。 The server recalculates the score and writes only the recalculated result; a client-provided `score` is informational and cannot determine ranking.

请求体：

```json
{
  "mode": "normal|daily",
  "scope": "all|daily",
  "code": "ASH-20260902-V1-ABCD",
  "weapon": "sword|staff|crossbow",
  "completedFloors": 38,
  "enemiesDefeated": 92,
  "bossesDefeated": 3,
  "durationMs": 241000,
  "hpRatio": 0.64,
  "gold": 180,
  "cleared": false,
  "submittedAt": "2026-09-02T12:00:00.000Z",
  "rulesVersion": 1,
  "submissionKey": "client-generated-idempotency-key"
}
```

服务端校验并重算：模式与范围必须匹配；楼层、敌人、Boss、生命比例、金币和时长必须在规则版本允许范围内；武器必须已知；每日挑战码必须与服务器当天有效挑战码匹配；`cleared` 只能由达到终局条件的字段推导。服务端使用 `accountKey + scopeKey` 做幂等和唯一归属，并依据重算后的分数、速度和提交时间保留更优记录。

成功响应 `200`：

```json
{
  "entry": {
    "rank": 7,
    "nickname": "灰烬旅人",
    "score": 9320,
    "completedFloors": 38,
    "durationMs": 241000,
    "weapon": "sword"
  },
  "accepted": true,
  "replaced": false
}
```

## 错误码

错误响应统一为：`{"error":{"code":"...","message":"..."}}`。

| HTTP | code | 含义 |
| --- | --- | --- |
| 400 | `INVALID_SCOPE` | 榜单范围非法或缺少必要参数 |
| 400 | `INVALID_FLOOR` | 楼层超出允许范围或与统计不一致 |
| 400 | `INVALID_WEAPON` | 武器标识未知或不在解锁规则内 |
| 400 | `INVALID_CHALLENGE_CODE` | 每日挑战码缺失、过期或与当天规则不匹配 |
| 400 | `INVALID_DURATION` | 通关时长不是非负整数或超出规则范围 |
| 400 | `INVALID_STATS` | 敌人、Boss、生命、金币等统计字段非法 |
| 401 | `NOT_LOGGED_IN` | 未取得有效虎扑会话 |
| 409 | `DUPLICATE_SUBMISSION` | 相同唯一键已处理；客户端可采用此前结果 |
| 429 | `RATE_LIMITED` | 提交频率超过限制 |
| 503 | `SERVICE_UNAVAILABLE` | 服务暂不可用；客户端保留本地待同步记录 |

校验失败不应影响本地结算；客户端展示“未同步”并可稍后重试。契约不包含任何云端部署、凭据或令牌配置。

## 隐私与分页检查清单

- 响应示例及实际公开响应仅含 `nickname`、`rank`、`score`、`completedFloors`、`durationMs`、`weapon` 等必要字段。
- 服务端日志和数据库中的账号稳定标识不得进入公开接口响应。
- `limit` 必须在服务端再次裁剪到 50，游标由服务端生成且不携带隐私信息。
- 云端请求失败时，客户端继续离线游戏并读取最近一次本地缓存。
