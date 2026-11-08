#!/usr/bin/env bash
# Kopieert de speelbare game naar www/ (webDir van Capacitor), zonder docs en tools.
set -euo pipefail
cd "$(dirname "$0")/.."
rm -rf www && mkdir -p www
cp -r index.html manifest.webmanifest lib src assets www/
echo "www/ klaar ($(du -sh www | cut -f1))"
