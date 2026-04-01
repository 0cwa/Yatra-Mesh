#!/bin/sh
set -e

BRANCH="gh-pages"
DEPLOY_DIR=$(mktemp -d)

cleanup() {
  cd "$(git rev-parse --show-toplevel)"
  git worktree remove --force "$DEPLOY_DIR" 2>/dev/null || true
  rm -rf "$DEPLOY_DIR"
}
trap cleanup EXIT

echo "🔨  Building GitHub Pages site..."
npm run build:gh-pages

echo "🌿  Preparing '$BRANCH' branch..."

# Check if the GitHub Pages branch already exists locally or on the remote
LOCAL_EXISTS=$(git show-ref --verify --quiet "refs/heads/$BRANCH" && echo yes || echo no)
REMOTE_EXISTS=$(git show-ref --verify --quiet "refs/remotes/origin/$BRANCH" && echo yes || echo no)

if [ "$LOCAL_EXISTS" = "yes" ]; then
  git worktree add "$DEPLOY_DIR" "$BRANCH"
elif [ "$REMOTE_EXISTS" = "yes" ]; then
  git fetch origin "$BRANCH"
  git worktree add "$DEPLOY_DIR" "origin/$BRANCH"
else
  # First deploy — create a fresh orphan branch
  echo "  No '$BRANCH' branch found, creating orphan..."
  git worktree add --orphan -b "$BRANCH" "$DEPLOY_DIR"
fi

echo "📦  Copying dist-gh-pages/ to deploy worktree..."
# Wipe everything except the .git reference file that worktree needs
find "$DEPLOY_DIR" -mindepth 1 -maxdepth 1 ! -name '.git' -exec rm -rf {} +
cp -r dist-gh-pages/. "$DEPLOY_DIR/"

cd "$DEPLOY_DIR"
git add -A

if git diff --cached --quiet; then
  echo "✅  Nothing new to deploy — already up to date."
else
  git commit -m "deploy: $(date -u +%Y-%m-%dT%H:%M:%SZ)"
  echo "🚀  Pushing to origin/$BRANCH..."
  git push origin "$BRANCH"
  echo "✅  Deployed! Your site is live on the '$BRANCH' branch."
fi
