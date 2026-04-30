export interface MessageFormData {
  key: string;
  content: string;
  headers: string;
  partition: number;
  partitions: number[];
  messageCount: number;
  keySerde: string;
  valueSerde: string;
  keySerdeParams?: Record<string, string>;
  valueSerdeParams?: Record<string, string>;
  keepContents: boolean;
}
