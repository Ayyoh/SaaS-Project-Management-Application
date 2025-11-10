import { betterAuth } from "better-auth";
import { drizzleAdapter } from "better-auth/adapters/drizzle";
import { db } from "../db/drizzle.js";
import * as schema from "../db/schema.js";
import { openAPI } from "better-auth/plugins";

export const auth = betterAuth({
  secret: process.env.BETTER_AUTH_SECRET!,
  baseURL: process.env.BETTER_AUTH_URL!,
  database: drizzleAdapter(db, {
    provider: "pg",
    schema,
  }),

  emailAndPassword: {
    enabled: true,
  },
  advanced: {
    disableOriginCheck: true,
    crossSubDomainCookies: {
      enabled: true,
    },
  },

  plugins: [openAPI()],
});
