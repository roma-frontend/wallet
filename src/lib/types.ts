export type TransactionType = "income" | "expense";

export type Recurrence = "none" | "weekly" | "monthly" | "yearly";

export type CurrencyCode =
  | "AMD"
  | "USD"
  | "EUR"
  | "RUB"
  | "GBP"
  | "GEL"
  | "CHF"
  | "JPY"
  | "CNY"
  | "TRY";

export interface Category {
  id: string;
  name: string;
  icon: string;
  color: string;
  type: TransactionType;
  isDefault?: boolean;
}

export interface Transaction {
  id: string;
  type: TransactionType;
  amount: number;
  currency: CurrencyCode;
  categoryId: string;
  note?: string;
  /** ISO date string: yyyy-MM-dd */
  date: string;
  recurrence: Recurrence;
  createdAt: number;
}

export interface Budget {
  id: string;
  categoryId: string;
  /** Monthly limit, stored in the app base currency */
  amount: number;
}

export interface Settings {
  baseCurrency: CurrencyCode;
  userName: string;
  /** Day of month a financial period starts (1-28) */
  monthStartDay: number;
}

export interface ExchangeRates {
  /** Base currency the rates are relative to */
  base: CurrencyCode;
  /** rates[X] = units of X per 1 unit of base */
  rates: Record<string, number>;
  /** epoch ms when fetched */
  fetchedAt: number;
}
