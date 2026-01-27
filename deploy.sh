# replace USER and HOST
SRC="dist/"      
DEST="/var/www/sites/portfolio"
SERVER="recsys-host"

rsync -av --delete \
  --rsync-path="sudo rsync" \
  "$SRC" "$SERVER:$DEST"

