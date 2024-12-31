#!/usr/bin/env node

import { Server } from "@modelcontextprotocol/sdk/server/index.js";
import { StdioServerTransport } from "@modelcontextprotocol/sdk/server/stdio.js";
import {
  CallToolRequestSchema,
  ListToolsRequestSchema,
  ErrorCode,
  McpError,
} from "@modelcontextprotocol/sdk/types.js";
import { Octokit } from "@octokit/rest";
import {
  ListRepositoriesArgs,
  CreateRepositoryArgs,
  CreateBranchArgs,
  CreateFileArgs,
  CreateIssueArgs,
  CreatePullRequestArgs,
  isCreateRepositoryArgs,
  isCreateBranchArgs,
  isCreateFileArgs,
  isCreateIssueArgs,
  isCreatePullRequestArgs,
} from "./types.js";

// GitHubトークンの確認
const GITHUB_TOKEN = process.env.GITHUB_TOKEN;
if (!GITHUB_TOKEN) {
  throw new Error("GITHUB_TOKEN environment variable is required");
}

// Octokitクライアントの初期化
const octokit = new Octokit({ auth: GITHUB_TOKEN });

// MCPサーバーの初期化
const server = new Server(
  {
    name: "github-server",
    version: "0.1.0",
  },
  {
    capabilities: {
      tools: {},
    },
  }
);

// 利用可能なツールの定義
server.setRequestHandler(ListToolsRequestSchema, async () => ({
  tools: [
    {
      name: "list_repositories",
      description: "List repositories for the authenticated user",
      inputSchema: {
        type: "object",
        properties: {
          per_page: {
            type: "number",
            description: "Number of repositories to return per page",
            default: 30,
          },
          page: {
            type: "number",
            description: "Page number of the results to fetch",
            default: 1,
          },
        },
      },
    },
    {
      name: "create_repository",
      description: "Create a new repository",
      inputSchema: {
        type: "object",
        properties: {
          name: {
            type: "string",
            description: "Repository name",
          },
          description: {
            type: "string",
            description: "Repository description",
          },
          private: {
            type: "boolean",
            description: "Whether the repository should be private",
            default: false,
          },
          auto_init: {
            type: "boolean",
            description: "Whether to create an initial commit with README",
            default: true,
          },
        },
        required: ["name"],
      },
    },
    {
      name: "create_branch",
      description: "Create a new branch in a repository",
      inputSchema: {
        type: "object",
        properties: {
          owner: {
            type: "string",
            description: "Repository owner",
          },
          repo: {
            type: "string",
            description: "Repository name",
          },
          branch: {
            type: "string",
            description: "The name of the new branch",
          },
          from: {
            type: "string",
            description: "The name of the branch to create from",
            default: "main",
          },
        },
        required: ["owner", "repo", "branch"],
      },
    },
    {
      name: "create_file",
      description: "Create a new file in a repository",
      inputSchema: {
        type: "object",
        properties: {
          owner: {
            type: "string",
            description: "Repository owner",
          },
          repo: {
            type: "string",
            description: "Repository name",
          },
          path: {
            type: "string",
            description: "The path to the file you want to create",
          },
          content: {
            type: "string",
            description: "The content of the file",
          },
          message: {
            type: "string",
            description: "The commit message",
          },
          branch: {
            type: "string",
            description: "The branch name",
          },
        },
        required: ["owner", "repo", "path", "content", "message", "branch"],
      },
    },
    {
      name: "create_issue",
      description: "Create a new issue in a repository",
      inputSchema: {
        type: "object",
        properties: {
          owner: {
            type: "string",
            description: "Repository owner",
          },
          repo: {
            type: "string",
            description: "Repository name",
          },
          title: {
            type: "string",
            description: "Issue title",
          },
          body: {
            type: "string",
            description: "Issue body",
          },
        },
        required: ["owner", "repo", "title", "body"],
      },
    },
    {
      name: "create_pull_request",
      description: "Create a new pull request",
      inputSchema: {
        type: "object",
        properties: {
          owner: {
            type: "string",
            description: "Repository owner",
          },
          repo: {
            type: "string",
            description: "Repository name",
          },
          title: {
            type: "string",
            description: "Pull request title",
          },
          body: {
            type: "string",
            description: "Pull request body",
          },
          head: {
            type: "string",
            description: "The name of the branch where your changes are implemented",
          },
          base: {
            type: "string",
            description: "The name of the branch you want your changes pulled into",
            default: "main",
          },
        },
        required: ["owner", "repo", "title", "body", "head"],
      },
    },
  ],
}));

// ツールの実装
server.setRequestHandler(CallToolRequestSchema, async (request) => {
  switch (request.params.name) {
    case "list_repositories": {
      try {
        const args = request.params.arguments as ListRepositoriesArgs | undefined;
        const per_page = args?.per_page ?? 30;
        const page = args?.page ?? 1;

        const response = await octokit.repos.listForAuthenticatedUser({
          per_page,
          page,
        });

        return {
          content: [
            {
              type: "text",
              text: JSON.stringify(response.data, null, 2),
            },
          ],
        };
      } catch (error: any) {
        throw new McpError(
          ErrorCode.InternalError,
          `Failed to list repositories: ${error.message}`
        );
      }
    }

    case "create_repository": {
      try {
        if (!isCreateRepositoryArgs(request.params.arguments)) {
          throw new McpError(
            ErrorCode.InvalidParams,
            "Invalid arguments: name is required"
          );
        }

        const response = await octokit.repos.createForAuthenticatedUser({
          name: request.params.arguments.name,
          description: request.params.arguments.description,
          private: request.params.arguments.private ?? false,
          auto_init: request.params.arguments.auto_init ?? true,
        });

        return {
          content: [
            {
              type: "text",
              text: JSON.stringify(response.data, null, 2),
            },
          ],
        };
      } catch (error: any) {
        throw new McpError(
          ErrorCode.InternalError,
          `Failed to create repository: ${error.message}`
        );
      }
    }

    case "create_branch": {
      try {
        if (!isCreateBranchArgs(request.params.arguments)) {
          throw new McpError(
            ErrorCode.InvalidParams,
            "Invalid arguments: owner, repo, and branch are required"
          );
        }

        // Get the SHA of the base branch
        const baseRef = await octokit.git.getRef({
          owner: request.params.arguments.owner,
          repo: request.params.arguments.repo,
          ref: `heads/${request.params.arguments.from ?? 'main'}`,
        });

        // Create new branch
        const response = await octokit.git.createRef({
          owner: request.params.arguments.owner,
          repo: request.params.arguments.repo,
          ref: `refs/heads/${request.params.arguments.branch}`,
          sha: baseRef.data.object.sha,
        });

        return {
          content: [
            {
              type: "text",
              text: JSON.stringify(response.data, null, 2),
            },
          ],
        };
      } catch (error: any) {
        throw new McpError(
          ErrorCode.InternalError,
          `Failed to create branch: ${error.message}`
        );
      }
    }

    case "create_file": {
      try {
        if (!isCreateFileArgs(request.params.arguments)) {
          throw new McpError(
            ErrorCode.InvalidParams,
            "Invalid arguments: owner, repo, path, content, message, and branch are required"
          );
        }

        const response = await octokit.repos.createOrUpdateFileContents({
          owner: request.params.arguments.owner,
          repo: request.params.arguments.repo,
          path: request.params.arguments.path,
          message: request.params.arguments.message,
          content: Buffer.from(request.params.arguments.content).toString('base64'),
          branch: request.params.arguments.branch,
        });

        return {
          content: [
            {
              type: "text",
              text: JSON.stringify(response.data, null, 2),
            },
          ],
        };
      } catch (error: any) {
        throw new McpError(
          ErrorCode.InternalError,
          `Failed to create file: ${error.message}`
        );
      }
    }

    case "create_issue": {
      try {
        if (!isCreateIssueArgs(request.params.arguments)) {
          throw new McpError(
            ErrorCode.InvalidParams,
            "Invalid arguments: owner, repo, title, and body are required"
          );
        }

        const response = await octokit.issues.create({
          owner: request.params.arguments.owner,
          repo: request.params.arguments.repo,
          title: request.params.arguments.title,
          body: request.params.arguments.body,
        });

        return {
          content: [
            {
              type: "text",
              text: JSON.stringify(response.data, null, 2),
            },
          ],
        };
      } catch (error: any) {
        throw new McpError(
          ErrorCode.InternalError,
          `Failed to create issue: ${error.message}`
        );
      }
    }

    case "create_pull_request": {
      try {
        if (!isCreatePullRequestArgs(request.params.arguments)) {
          throw new McpError(
            ErrorCode.InvalidParams,
            "Invalid arguments: owner, repo, title, body, and head are required"
          );
        }

        const response = await octokit.pulls.create({
          owner: request.params.arguments.owner,
          repo: request.params.arguments.repo,
          title: request.params.arguments.title,
          body: request.params.arguments.body,
          head: request.params.arguments.head,
          base: request.params.arguments.base ?? "main",
        });

        return {
          content: [
            {
              type: "text",
              text: JSON.stringify(response.data, null, 2),
            },
          ],
        };
      } catch (error: any) {
        throw new McpError(
          ErrorCode.InternalError,
          `Failed to create pull request: ${error.message}`
        );
      }
    }

    default:
      throw new McpError(ErrorCode.MethodNotFound, "Unknown tool");
  }
});

// サーバーの起動
async function main() {
  const transport = new StdioServerTransport();
  await server.connect(transport);
  console.error("GitHub MCP server running on stdio");
}

main().catch((error) => {
  console.error("Server error:", error);
  process.exit(1);
});
