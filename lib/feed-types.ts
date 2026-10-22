export interface FiiDiiRecord {
  date: string;
  fiiBuy: number;
  fiiSell: number;
  fiiNet: number;
  diiBuy: number;
  diiSell: number;
  diiNet: number;
  asOf: string;
}
export interface FiiDiiResponse {
  history: FiiDiiRecord[];
  latest: FiiDiiRecord;
  asOf: string;
  isStale: boolean;
  historySource?: string;
}
export interface IpoIssue {
  symbol: string;
  name: string;
  status: "ongoing" | "upcoming" | "listed";
  openDate: string;
  closeDate: string;
  priceBand: string;
  issueSize: string;
  subscription?: { qib?: number; nii?: number; retail?: number; total?: number };
  gmp?: string;
  listingGain?: string;
  listingDate?: string;
}
export interface IpoResponse {
  ongoing: IpoIssue[];
  upcoming: IpoIssue[];
  listed: IpoIssue[];
  asOf: string;
  isStale: boolean;
}
