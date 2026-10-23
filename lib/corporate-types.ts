export interface CorporateAnnouncement {
  id: string; symbol: string; companyName: string; subject: string;
  broadcastDate: string; attachmentUrl?: string; attachmentSize?: string; hasPdf: boolean;
}
export interface CorporateAction {
  id: string; symbol: string; companyName: string; purpose: string; series: string;
  exDate: string; recordDate: string;
}
export interface FinancialResult {
  id: string; symbol: string; companyName: string;
  audited: "Audited" | "Unaudited"; cumulative: "Consolidated" | "Standalone";
  broadcastDate: string; hasXml: boolean; attachmentUrl?: string;
}
export interface CorporateInfoResponse {
  announcements: CorporateAnnouncement[]; actions: CorporateAction[]; results: FinancialResult[];
  asOf: string; isStale: boolean;
}
export type CorporateTab = "announcements" | "actions" | "results";
