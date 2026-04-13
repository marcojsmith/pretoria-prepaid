import { internalMutation } from "./_generated/server";

const BATCH_SIZE = 1000;

export const clearAllHouseholdData = internalMutation({
  args: {},
  handler: async (ctx) => {
    const members = await ctx.db.query("household_members").take(BATCH_SIZE);
    for (const m of members) await ctx.db.delete(m._id);

    const invites = await ctx.db.query("household_invites").take(BATCH_SIZE);
    for (const inv of invites) await ctx.db.delete(inv._id);

    const households = await ctx.db.query("households").take(BATCH_SIZE);
    for (const h of households) await ctx.db.delete(h._id);
  },
});

export const clearAllUserData = internalMutation({
  args: {},
  handler: async (ctx) => {
    const profiles = await ctx.db.query("profiles").take(BATCH_SIZE);
    for (const p of profiles) await ctx.db.delete(p._id);

    const roles = await ctx.db.query("user_roles").take(BATCH_SIZE);
    for (const r of roles) await ctx.db.delete(r._id);

    const purchases = await ctx.db.query("purchases").take(BATCH_SIZE);
    for (const p of purchases) await ctx.db.delete(p._id);

    const readings = await ctx.db.query("meter_readings").take(BATCH_SIZE);
    for (const r of readings) await ctx.db.delete(r._id);

    const members = await ctx.db.query("household_members").take(BATCH_SIZE);
    for (const m of members) await ctx.db.delete(m._id);

    const invites = await ctx.db.query("household_invites").take(BATCH_SIZE);
    for (const inv of invites) await ctx.db.delete(inv._id);

    const households = await ctx.db.query("households").take(BATCH_SIZE);
    for (const h of households) await ctx.db.delete(h._id);
  },
});
