# QPI TestSite (staging)

Staging copy of the QPI website, for live testing before changes go to
production at <https://qpi-inspect.com>.

**Do not edit this repo by hand.** It is generated from the QPI-Website
repo by `tools/build-staging.py`. Edits here are overwritten on the next
build. Make changes in QPI-Website, rebuild, and push.

Differences from production, all deliberate:

- Relative asset paths (GitHub Pages serves this at a subpath)
- No `CNAME` (two repos claiming qpi-inspect.com would break the live site)
- `robots.txt` disallows everything, and every page carries `noindex, nofollow`
- No `sitemap.xml`
- A fixed "STAGING" badge in the corner
