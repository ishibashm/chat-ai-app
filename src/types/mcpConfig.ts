export interface McpServerEnvConfig {
  [key: string]: string;
}

export interface McpServerConfig {
  command: string;
  args: string[];
  env: McpServerEnvConfig;
  disabled?: boolean;
  alwaysAllow?: string[];
}

export interface McpConfig {
  mcpServers: {
    [key: string]: McpServerConfig;
  };
}

export interface UpdateServerConfigRequest {
  serverName: string;
  config: McpServerConfig;
}

export interface DeleteServerConfigRequest {
  serverName: string;
}