# credentials-polyfill ChangeLog

## 1.0.0 - 2017-02-22

### Changed
- Use iframe by default and simplify dialog.

## 0.10.1 - 2016-12-12

### Added
- Add `enableRegistration` flag.
- Allow error text to be passed through channel.

## 0.10.0 - 2016-07-21

### Added
- **BREAKING**: Add experimental support for IE11. This change requires
  dropping backwards compatibility support that was in version 0.8.x. IE11
  is supported via use of an iframe, as IE11 does not support using
  postMessage with cross-domain windows.

- See git history for changes.
