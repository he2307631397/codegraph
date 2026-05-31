/**
 * Jcode target.
 *
 * Jcode reads MCP server definitions from `~/.jcode/mcp.json` (global)
 * and `./.jcode/mcp.json` (project-local). Its config shape is:
 *
 *   {
 *     "servers": {
 *       "codegraph": {
 *         "command": "codegraph",
 *         "args": ["serve", "--mcp"],
 *         "env": {},
 *         "shared": true
 *       }
 *     }
 *   }
 *
 * No permissions or instructions-file concept is needed here: CodeGraph's
 * usage guidance is provided by the MCP server's `initialize` response.
 */

import * as fs from 'fs';
import * as path from 'path';
import * as os from 'os';
import {
  AgentTarget,
  DetectionResult,
  InstallOptions,
  Location,
  WriteResult,
} from './types';
import {
  jsonDeepEqual,
  readJsonFile,
  writeJsonFile,
} from './shared';

interface JcodeServerConfig {
  command: string;
  args: string[];
  env: Record<string, string>;
  shared: boolean;
}

function configDir(loc: Location): string {
  return loc === 'global'
    ? path.join(os.homedir(), '.jcode')
    : path.join(process.cwd(), '.jcode');
}

function mcpJsonPath(loc: Location): string {
  return path.join(configDir(loc), 'mcp.json');
}

function getJcodeServerConfig(): JcodeServerConfig {
  return {
    command: 'codegraph',
    args: ['serve', '--mcp'],
    env: {},
    shared: true,
  };
}

class JcodeTarget implements AgentTarget {
  readonly id = 'jcode' as const;
  readonly displayName = 'Jcode';
  readonly docsUrl = 'https://github.com/1jehuang/jcode';

  supportsLocation(_loc: Location): boolean {
    return true;
  }

  detect(loc: Location): DetectionResult {
    const file = mcpJsonPath(loc);
    const config = readJsonFile(file);
    const alreadyConfigured = !!config.servers?.codegraph;
    const installed = loc === 'global'
      ? fs.existsSync(configDir('global')) || fs.existsSync(file)
      : fs.existsSync(configDir('local')) || fs.existsSync(file);
    return { installed, alreadyConfigured, configPath: file };
  }

  install(loc: Location, _opts: InstallOptions): WriteResult {
    return { files: [writeMcpEntry(loc)] };
  }

  uninstall(loc: Location): WriteResult {
    const file = mcpJsonPath(loc);
    const config = readJsonFile(file);
    if (config.servers?.codegraph) {
      delete config.servers.codegraph;
      if (Object.keys(config.servers).length === 0) {
        delete config.servers;
      }
      writeJsonFile(file, config);
      return { files: [{ path: file, action: 'removed' }] };
    }
    return { files: [{ path: file, action: 'not-found' }] };
  }

  printConfig(loc: Location): string {
    const target = mcpJsonPath(loc);
    const snippet = JSON.stringify({ servers: { codegraph: getJcodeServerConfig() } }, null, 2);
    return `# Add to ${target}\n\n${snippet}\n`;
  }

  describePaths(loc: Location): string[] {
    return [mcpJsonPath(loc)];
  }
}

function writeMcpEntry(loc: Location): WriteResult['files'][number] {
  const file = mcpJsonPath(loc);
  const existing = readJsonFile(file);
  const before = existing.servers?.codegraph;
  const after = getJcodeServerConfig();

  if (jsonDeepEqual(before, after)) {
    return { path: file, action: 'unchanged' };
  }

  const action: 'created' | 'updated' = before ? 'updated' : (fs.existsSync(file) ? 'updated' : 'created');
  if (!existing.servers) existing.servers = {};
  existing.servers.codegraph = after;
  writeJsonFile(file, existing);
  return { path: file, action };
}

export const jcodeTarget: AgentTarget = new JcodeTarget();
