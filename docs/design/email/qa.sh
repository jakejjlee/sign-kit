#!/bin/bash
# QA shots of each surface of each option into the scratchpad. usage: qa.sh d1 s2   (s1 desktop 1000 wide, s2/s3 390 wide)
S=/private/tmp/claude-501/-Users-macbook/17d67d1f-5c9b-40d3-b56f-b221754510aa/scratchpad/qa
H=$(cd "$(dirname "$0")" && pwd)/board
mkdir -p $S && cp -r $H/assets $S/
python3 - "$H" "$S" "$1" <<'PY'
import sys
H,S,k=sys.argv[1:4]
h=open(f'{H}/{k}.html').read(); secs=h.split('<section class="sfc">')
for i in (1,2,3):
    t=secs[0]+'<section class="sfc">'+secs[i].split('</section>')[0]+'</section></main></body></html>'
    open(f'{S}/{k}-s{i}.html','w').write(t)
PY
W=390; HT=${3:-1700}; [ "$2" = s1 ] && W=1000
$HOME/.claude/bin/chrome-headless --headless=new --disable-gpu --hide-scrollbars --virtual-time-budget=6000 --window-size=$W,$HT --screenshot=$S/$1-$2.png file://$S/$1-$2.html >/dev/null 2>&1
echo $S/$1-$2.png
