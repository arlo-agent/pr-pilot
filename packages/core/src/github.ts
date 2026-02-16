import { Octokit } from '@octokit/rest';
import type { GitHubPR, GitHubIssue } from './types.js';

function makeOctokit(token: string) {
  return new Octokit({ auth: token });
}

export async function fetchOpenPRs(
  owner: string,
  repo: string,
  token: string,
  maxItems = 100,
): Promise<GitHubPR[]> {
  const octokit = makeOctokit(token);
  const prs: GitHubPR[] = [];

  for await (const response of octokit.paginate.iterator(
    octokit.rest.pulls.list,
    { owner, repo, state: 'open', per_page: Math.min(maxItems, 100) },
  )) {
    for (const pr of response.data) {
      if (prs.length >= maxItems) break;
      const files = await fetchPRFiles(owner, repo, pr.number, token);
      prs.push({
        number: pr.number,
        title: pr.title,
        body: pr.body ?? '',
        state: pr.state,
        author: pr.user?.login ?? 'unknown',
        authorAssociation: pr.author_association ?? 'NONE',
        createdAt: pr.created_at,
        updatedAt: pr.updated_at,
        mergedAt: pr.merged_at ?? null,
        closedAt: pr.closed_at ?? null,
        labels: pr.labels.map((l) => (typeof l === 'string' ? l : l.name ?? '')),
        reviewDecision: null,
        additions: 0,
        deletions: 0,
        changedFiles: files.length,
        comments: 0,
        reviewComments: 0,
        commits: 0,
        filesChanged: files,
        draft: pr.draft ?? false,
        mergeable: null,
        headRef: pr.head?.ref ?? '',
        baseRef: pr.base?.ref ?? '',
      });
    }
    if (prs.length >= maxItems) break;
  }
  return prs;
}

export async function fetchOpenIssues(
  owner: string,
  repo: string,
  token: string,
  maxItems = 100,
): Promise<GitHubIssue[]> {
  const octokit = makeOctokit(token);
  const issues: GitHubIssue[] = [];

  for await (const response of octokit.paginate.iterator(
    octokit.rest.issues.listForRepo,
    { owner, repo, state: 'open', per_page: Math.min(maxItems, 100) },
  )) {
    for (const issue of response.data) {
      if (issues.length >= maxItems) break;
      if (issue.pull_request) continue; // skip PRs
      issues.push({
        number: issue.number,
        title: issue.title,
        body: issue.body ?? '',
        state: issue.state ?? 'open',
        author: issue.user?.login ?? 'unknown',
        createdAt: issue.created_at,
        updatedAt: issue.updated_at,
        closedAt: issue.closed_at ?? null,
        labels: issue.labels.map((l) => (typeof l === 'string' ? l : l.name ?? '')),
        comments: issue.comments,
        assignees: issue.assignees?.map((a) => a.login) ?? [],
        isPullRequest: false,
      });
    }
    if (issues.length >= maxItems) break;
  }
  return issues;
}

export async function fetchPRFiles(
  owner: string,
  repo: string,
  prNumber: number,
  token: string,
): Promise<string[]> {
  const octokit = makeOctokit(token);
  const { data } = await octokit.rest.pulls.listFiles({
    owner,
    repo,
    pull_number: prNumber,
    per_page: 100,
  });
  return data.map((f) => f.filename);
}

export async function fetchVisionDocument(
  owner: string,
  repo: string,
  token: string,
  path?: string,
): Promise<string | null> {
  const octokit = makeOctokit(token);
  const paths = path ? [path] : ['VISION.md', 'README.md'];

  for (const p of paths) {
    try {
      const { data } = await octokit.rest.repos.getContent({ owner, repo, path: p });
      if ('content' in data && typeof data.content === 'string') {
        return Buffer.from(data.content, 'base64').toString('utf-8');
      }
    } catch {
      continue;
    }
  }
  return null;
}
