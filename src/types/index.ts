export type User = 'lena' | 'moritz';
export type Area = 'private' | 'shared';

export interface Receipt {
  id: string;
  created_at: string;
  updated_at: string;

  // Ownership
  owner: User;
  is_shared: boolean;
  paid_by: User;

  // Extracted fields
  receipt_date: string | null;
  merchant: string | null;
  total_amount: number | null;
  category: string;

  // VAT (optional)
  vat_7_base: number | null;
  vat_7_amount: number | null;
  vat_19_base: number | null;
  vat_19_amount: number | null;

  // Metadata
  note: string | null;
  telegram_message_id: number | null;
  telegram_user_id: number | null;
  file_path: string | null;

  // Extraction quality
  extraction_confidence: 'high' | 'medium' | 'low' | null;
}

export interface ReceiptFilters {
  dateFrom: string;
  dateTo: string;
  category: string;
  merchant: string;
  amountMin: string;
  amountMax: string;
  paidBy: string;
}

export type StatsPeriod = 'week' | 'month' | 'quarter' | 'year' | 'all';

export interface CategoryStat {
  category: string;
  total: number;
  count: number;
}

export interface MerchantStat {
  merchant: string;
  total: number;
  count: number;
}

export interface TimeStat {
  period: string;
  total: number;
  count: number;
}

export interface PayerStat {
  payer: User;
  total: number;
  count: number;
}
