#!/usr/bin/env bash
# Vercel 최신 배포 상태를 READY/ERROR/CANCELED 가 될 때까지 폴링한다.
# 사용: bash scripts/poll-deploy.sh
set -u

PROJECT_ID="prj_rUKewXJD8er2nWQaeBIwzb6EBoFH"
TEAM_SLUG="dr-parks-projects"

TOKEN=$(node -e "const fs=require('fs');console.log(JSON.parse(fs.readFileSync(process.env.APPDATA+'/com.vercel.cli/Data/auth.json','utf8')).token)")
TEAM_ID=$(node -e "const t=JSON.parse(process.argv[1]).teams||[];const m=t.find(x=>x.slug==='$TEAM_SLUG');console.log(m?m.id:'')" "$(curl -s -H "Authorization: Bearer $TOKEN" https://api.vercel.com/v2/teams)")

for i in $(seq 1 40); do
  D=$(curl -s -H "Authorization: Bearer $TOKEN" "https://api.vercel.com/v6/deployments?projectId=$PROJECT_ID&teamId=$TEAM_ID&limit=1")
  STATE=$(node -e "const d=(JSON.parse(process.argv[1]).deployments||[])[0];console.log(d?(d.state||d.readyState):'NONE')" "$D")
  echo "[$i] $STATE"
  case "$STATE" in READY|ERROR|CANCELED) break ;; esac
  sleep 6
done
