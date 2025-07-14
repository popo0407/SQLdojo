export interface SqlExecutionResult {
  success: boolean;
  data?: { [key: string]: any }[];
  columns?: string[];
  row_count?: number;
  execution_time?: number;
  error_message?: string;
  sql: string;
} 