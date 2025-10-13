#!/usr/bin/env node
'use strict';

const { execSync } = require('node:child_process');

function run(cmd, options = {}) {
  return execSync(cmd, { encoding: 'utf8', stdio: ['pipe', 'pipe', 'pipe'], ...options }).trim();
}

function ensureGitRepo() {
  try {
    run('git rev-parse --is-inside-work-tree');
  } catch (error) {
    console.error('This script must be run inside a git repository.');
    process.exit(2);
  }
}

function ensureRemote(remoteName) {
  const remotesRaw = run('git remote');
  const remotes = remotesRaw.split(/\s+/).filter(Boolean);
  if (!remotes.includes(remoteName)) {
    console.error(`Remote "${remoteName}" is not configured.\nAdd it with: git remote add ${remoteName} <repository-url>`);
    process.exit(3);
  }
}

function fetchRemote(remoteName) {
  try {
    execSync(`git fetch ${remoteName} --prune`, { stdio: 'inherit' });
  } catch (error) {
    console.error(`Failed to fetch from remote "${remoteName}".`);
    process.exit(error.status || 4);
  }
}

function getRemoteHeadBranch(remoteName) {
  try {
    const info = run(`git remote show ${remoteName}`);
    const match = info.match(/HEAD branch:\s*(\S+)/);
    return match ? match[1] : null;
  } catch (error) {
    return null;
  }
}

function remoteRefExists(remoteName, ref) {
  try {
    execSync(`git show-ref --verify --quiet refs/remotes/${remoteName}/${ref}`);
    return true;
  } catch (error) {
    return false;
  }
}

function getCurrentBranch() {
  try {
    return run('git rev-parse --abbrev-ref HEAD');
  } catch (error) {
    return 'HEAD';
  }
}

function compareRefs(localRef, remoteRef) {
  const output = run(`git rev-list --left-right --count ${localRef}...${remoteRef}`);
  const [aheadRaw, behindRaw] = output.split(/\s+/);
  const ahead = Number.parseInt(aheadRaw, 10) || 0;
  const behind = Number.parseInt(behindRaw, 10) || 0;
  return { ahead, behind };
}

function main() {
  const remoteName = 'codex';
  ensureGitRepo();
  ensureRemote(remoteName);
  fetchRemote(remoteName);

  const currentBranch = getCurrentBranch();
  const localRef = currentBranch === 'HEAD' ? 'HEAD' : currentBranch;

  let targetBranch = currentBranch !== 'HEAD' && remoteRefExists(remoteName, currentBranch)
    ? currentBranch
    : getRemoteHeadBranch(remoteName);

  if (!targetBranch) {
    console.error(`Unable to determine a branch on remote "${remoteName}" to compare against.`);
    process.exit(5);
  }

  if (currentBranch !== 'HEAD' && targetBranch !== currentBranch) {
    console.log(`Remote "${remoteName}" does not have a "${currentBranch}" branch; comparing against its HEAD branch "${targetBranch}".`);
  }

  const remoteRef = `${remoteName}/${targetBranch}`;
  const { ahead, behind } = compareRefs(localRef, remoteRef);

  if (behind === 0 && ahead === 0) {
    console.log('✅ Repository is up to date with remote changes.');
    process.exit(0);
  }

  if (behind > 0) {
    console.log(`⬇️  Repository is behind remote by ${behind} commit${behind === 1 ? '' : 's'}.`);
  }

  if (ahead > 0) {
    console.log(`⬆️  Repository is ahead of remote by ${ahead} commit${ahead === 1 ? '' : 's'}.`);
  }

  process.exit(1);
}

main();
