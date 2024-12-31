// 基本的な引数の型定義
export interface ListRepositoriesArgs {
  per_page?: number;
  page?: number;
}

export interface CreateRepositoryArgs {
  name: string;
  description?: string;
  private?: boolean;
  auto_init?: boolean;
}

export interface CreateBranchArgs {
  owner: string;
  repo: string;
  branch: string;
  from?: string;
}

export interface CreateFileArgs {
  owner: string;
  repo: string;
  path: string;
  content: string;
  message: string;
  branch: string;
}

export interface CreateIssueArgs {
  owner: string;
  repo: string;
  title: string;
  body: string;
}

export interface CreatePullRequestArgs {
  owner: string;
  repo: string;
  title: string;
  body: string;
  head: string;
  base: string;
}

// 型ガード関数
export function isCreateRepositoryArgs(args: unknown): args is CreateRepositoryArgs {
  if (!args || typeof args !== 'object') return false;
  const a = args as Record<string, unknown>;
  return (
    typeof a.name === 'string' &&
    (a.description === undefined || typeof a.description === 'string') &&
    (a.private === undefined || typeof a.private === 'boolean') &&
    (a.auto_init === undefined || typeof a.auto_init === 'boolean')
  );
}

export function isCreateBranchArgs(args: unknown): args is CreateBranchArgs {
  if (!args || typeof args !== 'object') return false;
  const a = args as Record<string, unknown>;
  return (
    typeof a.owner === 'string' &&
    typeof a.repo === 'string' &&
    typeof a.branch === 'string' &&
    (a.from === undefined || typeof a.from === 'string')
  );
}

export function isCreateFileArgs(args: unknown): args is CreateFileArgs {
  if (!args || typeof args !== 'object') return false;
  const a = args as Record<string, unknown>;
  return (
    typeof a.owner === 'string' &&
    typeof a.repo === 'string' &&
    typeof a.path === 'string' &&
    typeof a.content === 'string' &&
    typeof a.message === 'string' &&
    typeof a.branch === 'string'
  );
}

export function isCreateIssueArgs(args: unknown): args is CreateIssueArgs {
  if (!args || typeof args !== 'object') return false;
  const a = args as Record<string, unknown>;
  return (
    typeof a.owner === 'string' &&
    typeof a.repo === 'string' &&
    typeof a.title === 'string' &&
    typeof a.body === 'string'
  );
}

export function isCreatePullRequestArgs(args: unknown): args is CreatePullRequestArgs {
  if (!args || typeof args !== 'object') return false;
  const a = args as Record<string, unknown>;
  return (
    typeof a.owner === 'string' &&
    typeof a.repo === 'string' &&
    typeof a.title === 'string' &&
    typeof a.body === 'string' &&
    typeof a.head === 'string' &&
    typeof a.base === 'string'
  );
}