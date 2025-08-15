export interface AppState {
  userName: string;
  someDefaultState: string;
  embedDashboard?: any;
  serverProxyResponse?: any;
}

export type EmbedType = 'look' | 'dashboard' | 'explore';