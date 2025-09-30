// マスターデータの型定義

export interface StationMaster {
  sta_no1: string;
  place_name: string;
  sta_no2: string;
  line_name: string;
  sta_no3: string;
  st_name: string;
}

export interface MeasureMaster {
  sta_no1: string;
  sta_no2: string;
  sta_no3: string;
  item_name: string;
  measure_info: string;
  measure: string;
  division_figure: number;
}

export interface SetMaster {
  sta_no1: string;
  sta_no2: string;
  sta_no3: string;
  item_name: string;
  setdata: string;
}

export interface FreeMaster {
  sta_no1: string;
  sta_no2: string;
  sta_no3: string;
  item_name: string;
  freedata: string;
}

export interface PartsMaster {
  sta_no1: string;
  sta_no2: string;
  sta_no3: string;
  main_parts_name: string;
  sub_parts: string;
  sub_parts_name: string;
}

export interface TroubleMaster {
  sta_no1: string;
  sta_no2: string;
  sta_no3: string;
  code_no: string;
  trouble_ng_info: string;
}