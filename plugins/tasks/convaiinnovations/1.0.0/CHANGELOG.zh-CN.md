---
changelogVersion: 1
plugin: "convaiinnovations"
version: "1.0.0"
locale: "zh-CN"
---
# Changelog

## [1.0.0]

### Added

- 通过 `POST /v1/systemone` 调用本地 laya 服务（可通过 laya-serve 启动本地的类 jev 服务），支持 Choice、Score 和 Noul 问题类型，同步返回原始答案、概率和 token 用量。