---
changelogVersion: 1
plugin: "convaiinnovations"
version: "1.0.0"
locale: "en"
translations:
  zh-CN: "CHANGELOG.zh-CN.md"
---
# Changelog

## [1.0.0]

### Added

- Call local laya service (can be started locally via laya-serve as a Jev-like service) through `POST /v1/systemone` with support for Choice, Score, and Noul question types, returning original answers, probabilities, and token usage in a synchronous response.