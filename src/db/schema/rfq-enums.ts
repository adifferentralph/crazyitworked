import { pgEnum } from "drizzle-orm/pg-core";

export const partRequestStatusEnum = pgEnum("part_request_status", [
  "DRAFT",
  "OPEN",
  "QUOTED",
  "ACCEPTED",
  "CLOSED",
  "CANCELLED",
  "EXPIRED",
]);

export const sellerRequestMatchStatusEnum = pgEnum("seller_request_match_status", [
  "MATCHED",
  "VIEWED",
  "QUOTED",
  "DECLINED",
]);

export const partQuoteStatusEnum = pgEnum("part_quote_status", [
  "SUBMITTED",
  "REVISED",
  "ACCEPTED",
  "REJECTED",
  "WITHDRAWN",
  "EXPIRED",
]);