#!/bin/zsh

cd "${0:A:h}" || exit 1
exec /Users/georgearauz/.cache/codex-runtimes/codex-primary-runtime/dependencies/node/bin/node node_modules/expo/bin/cli login
