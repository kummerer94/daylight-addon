# Daylight for Home Assistant

Add https://github.com/kummerer94/daylight-addon in Home Assistant's app store repositories.
First add ghcr.io registry credentials: username kummerer94 and a GitHub classic token with only read:packages.
See [installation and backups](daylight/DOCS.md).

For the dashboard card, open HACS → ⋮ → Custom repositories, add this repository's URL,
and choose type **Dashboard**. Download **Daylight card**. HACS adds the JavaScript module
resource automatically in storage mode: /hacsfiles/daylight-addon/daylight-card.js.
For YAML-managed resources, add that URL with type: module yourself.
Add a manual dashboard card with `type: custom:daylight-card`.

HACS follows this repository's default branch. Without GitHub releases it displays the
short commit ID as the version; tags alone do not supply HACS release versions.
The card's own version matches the app version in daylight/config.yaml. Update both together.

This repository contains only public installation files and the dashboard card JavaScript.
All other application code and the container image remain private.
The private Daylight release workflow maintains these files after publishing both supported image architectures.
