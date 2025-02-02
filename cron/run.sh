#!/bin/bash -l
source $HOME/.bashrc  # or ~/.bash_profile if using macOS
export PATH=$HOME/.nvm/versions/node/v20.16.0/bin/node:$HOME/.yarn/bin:$PATH
export NVM_DIR="$HOME/.nvm"
source $NVM_DIR/nvm.sh  # Loads nvm so Node.js is available

export SSH_AUTH_SOCK=$(ls /tmp/ssh-*/agent.* | head -n 1)


# Debugging info
echo "Running at $(date)" >> /home/jake/cron_git.log
echo "SSH_AUTH_SOCK: $SSH_AUTH_SOCK" >> /home/jake/cron_git.log
echo "Git remote: $(git remote -v)" >> /home/jake/cron_git.log
echo "Current user: $(whoami)" >> /home/jake/cron_git.log

cd /home/jake/dev/barrieMelee/BarrieSlippiLeaderboard

# git remote set-url origin git@github.com:Mackintac/BarrieSlippiLeaderboard.git


set -e
DIR_PATH=$( cd -- "$( dirname -- "${BASH_SOURCE[0]}" )" &> /dev/null && pwd )
cd "$DIR_PATH/.." 

mkdir -p cron/data
if [ ! -f cron/data/players-new.json ]; then
  echo '[]' >> cron/data/players-new.json
fi
mkdir -p cron/logs
if [ ! -f cron/logs/log.txt ]; then
  touch cron/logs/log.txt
fi

yarn ts-node cron/fetchStats.ts 2>&1 | tee cron/logs/log.txt
yarn run deploy -- -u "github-actions-bot <support+actions@github.com>"
