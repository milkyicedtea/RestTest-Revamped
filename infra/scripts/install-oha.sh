#!/usr/bin/env bash
# One-time provisioning of a dedicated oha load-generator server (no Docker
# needed). Installs oha from the azlux repository, same recipe the old
# infra/oha image used.
#
# Usage: ./install-oha.sh        (run as root, or with sudo)
set -euo pipefail

if [[ "$(id -u)" -ne 0 ]]; then
  echo "Run as root (sudo ./install-oha.sh)." >&2
  exit 1
fi

apt-get update
apt-get install -y curl wget gnupg ca-certificates

wget -O /usr/share/keyrings/azlux-archive-keyring.gpg https://azlux.fr/repo.gpg
echo "deb [signed-by=/usr/share/keyrings/azlux-archive-keyring.gpg] http://packages.azlux.fr/debian/ stable main" \
  > /etc/apt/sources.list.d/azlux.list

apt-get update
apt-get install -y oha

oha --version
echo "oha installed. Next: create a user for the orchestrator, install its SSH key, and allow that user to reach the API servers."
