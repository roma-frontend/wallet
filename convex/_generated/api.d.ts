/* eslint-disable */
/**
 * Generated `api` utility.
 *
 * THIS CODE IS AUTOMATICALLY GENERATED.
 *
 * To regenerate, run `npx convex dev`.
 * @module
 */

import type * as accounts from "../accounts.js";
import type * as auth from "../auth.js";
import type * as budgets from "../budgets.js";
import type * as categories from "../categories.js";
import type * as crons from "../crons.js";
import type * as crypto from "../crypto.js";
import type * as debts from "../debts.js";
import type * as defaults from "../defaults.js";
import type * as files from "../files.js";
import type * as goals from "../goals.js";
import type * as helpers from "../helpers.js";
import type * as http from "../http.js";
import type * as notifications from "../notifications.js";
import type * as ratelimit from "../ratelimit.js";
import type * as recurring from "../recurring.js";
import type * as reports from "../reports.js";
import type * as settings from "../settings.js";
import type * as transactions from "../transactions.js";

import type {
  ApiFromModules,
  FilterApi,
  FunctionReference,
} from "convex/server";

declare const fullApi: ApiFromModules<{
  accounts: typeof accounts;
  auth: typeof auth;
  budgets: typeof budgets;
  categories: typeof categories;
  crons: typeof crons;
  crypto: typeof crypto;
  debts: typeof debts;
  defaults: typeof defaults;
  files: typeof files;
  goals: typeof goals;
  helpers: typeof helpers;
  http: typeof http;
  notifications: typeof notifications;
  ratelimit: typeof ratelimit;
  recurring: typeof recurring;
  reports: typeof reports;
  settings: typeof settings;
  transactions: typeof transactions;
}>;

/**
 * A utility for referencing Convex functions in your app's public API.
 *
 * Usage:
 * ```js
 * const myFunctionReference = api.myModule.myFunction;
 * ```
 */
export declare const api: FilterApi<
  typeof fullApi,
  FunctionReference<any, "public">
>;

/**
 * A utility for referencing Convex functions in your app's internal API.
 *
 * Usage:
 * ```js
 * const myFunctionReference = internal.myModule.myFunction;
 * ```
 */
export declare const internal: FilterApi<
  typeof fullApi,
  FunctionReference<any, "internal">
>;

export declare const components: {};
