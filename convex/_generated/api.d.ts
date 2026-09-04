/* eslint-disable */
/**
 * Generated `api` utility.
 *
 * THIS CODE IS AUTOMATICALLY GENERATED.
 *
 * To regenerate, run `npx convex dev`.
 * @module
 */

import type * as admin from "../admin.js";
import type * as alerts from "../alerts.js";
import type * as alerts_queries from "../alerts_queries.js";
import type * as constants from "../constants.js";
import type * as crons from "../crons.js";
import type * as electricity_logic from "../electricity_logic.js";
import type * as household from "../household.js";
import type * as lib_date from "../lib/date.js";
import type * as lib_household from "../lib/household.js";
import type * as lib_meters from "../lib/meters.js";
import type * as lib_rateLimiter from "../lib/rateLimiter.js";
import type * as meters from "../meters.js";
import type * as migrations from "../migrations.js";
import type * as purchases from "../purchases.js";
import type * as rates from "../rates.js";
import type * as readings from "../readings.js";
import type * as users from "../users.js";

import type {
  ApiFromModules,
  FilterApi,
  FunctionReference,
} from "convex/server";

declare const fullApi: ApiFromModules<{
  admin: typeof admin;
  alerts: typeof alerts;
  alerts_queries: typeof alerts_queries;
  constants: typeof constants;
  crons: typeof crons;
  electricity_logic: typeof electricity_logic;
  household: typeof household;
  "lib/date": typeof lib_date;
  "lib/household": typeof lib_household;
  "lib/meters": typeof lib_meters;
  "lib/rateLimiter": typeof lib_rateLimiter;
  meters: typeof meters;
  migrations: typeof migrations;
  purchases: typeof purchases;
  rates: typeof rates;
  readings: typeof readings;
  users: typeof users;
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
