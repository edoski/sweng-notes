/* eslint-disable */
/**
 * Generated `api` utility.
 *
 * THIS CODE IS AUTOMATICALLY GENERATED.
 *
 * To regenerate, run `npx convex dev`.
 * @module
 */

import type * as http from "../http.js";
import type * as lib_auth from "../lib/auth.js";
import type * as lib_dates from "../lib/dates.js";
import type * as lib_liveblocks_user_info from "../lib/liveblocks_user_info.js";
import type * as lib_logger from "../lib/logger.js";
import type * as lib_note_access from "../lib/note_access.js";
import type * as lib_note_filters from "../lib/note_filters.js";
import type * as lib_note_helpers from "../lib/note_helpers.js";
import type * as lib_note_permissions from "../lib/note_permissions.js";
import type * as lib_note_tags from "../lib/note_tags.js";
import type * as lib_note_titles from "../lib/note_titles.js";
import type * as lib_presence_info from "../lib/presence_info.js";
import type * as lib_tags from "../lib/tags.js";
import type * as lib_test_helpers from "../lib/test_helpers.js";
import type * as lib_user_helpers from "../lib/user_helpers.js";
import type * as lib_validation from "../lib/validation.js";
import type * as lib_zod from "../lib/zod.js";
import type * as liveblocks from "../liveblocks.js";
import type * as notes_mutations from "../notes/mutations.js";
import type * as notes_queries from "../notes/queries.js";
import type * as permissions from "../permissions.js";
import type * as sharing from "../sharing.js";
import type * as tags from "../tags.js";
import type * as users from "../users.js";
import type * as versions from "../versions.js";

import type {
  ApiFromModules,
  FilterApi,
  FunctionReference,
} from "convex/server";

declare const fullApi: ApiFromModules<{
  http: typeof http;
  "lib/auth": typeof lib_auth;
  "lib/dates": typeof lib_dates;
  "lib/liveblocks_user_info": typeof lib_liveblocks_user_info;
  "lib/logger": typeof lib_logger;
  "lib/note_access": typeof lib_note_access;
  "lib/note_filters": typeof lib_note_filters;
  "lib/note_helpers": typeof lib_note_helpers;
  "lib/note_permissions": typeof lib_note_permissions;
  "lib/note_tags": typeof lib_note_tags;
  "lib/note_titles": typeof lib_note_titles;
  "lib/presence_info": typeof lib_presence_info;
  "lib/tags": typeof lib_tags;
  "lib/test_helpers": typeof lib_test_helpers;
  "lib/user_helpers": typeof lib_user_helpers;
  "lib/validation": typeof lib_validation;
  "lib/zod": typeof lib_zod;
  liveblocks: typeof liveblocks;
  "notes/mutations": typeof notes_mutations;
  "notes/queries": typeof notes_queries;
  permissions: typeof permissions;
  sharing: typeof sharing;
  tags: typeof tags;
  users: typeof users;
  versions: typeof versions;
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
