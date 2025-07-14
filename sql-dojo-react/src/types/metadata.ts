export interface Column {
  name: string;
  data_type: string;
  comment: string | null;
}

export interface Table {
  name: string;
  schema_name: string;
  table_type: 'TABLE' | 'VIEW';
  comment: string | null;
  columns: Column[];
}

export interface Schema {
  name: string;
  comment: string | null;
  tables: Table[];
} 