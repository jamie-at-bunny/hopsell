import "dotenv/config";
import { db } from "./index.server";
import * as schema from "./schema";
import { hashPassword } from "better-auth/crypto";
import { inArray } from "drizzle-orm";

async function seed() {
  console.log("Seeding database...");
  console.log("Note: Run `npm run db:migrate` first if tables don't exist.\n");

  // Clear existing data (in reverse order of dependencies)
  const tables = [
    schema.notification,
    schema.teamMember,
    schema.team,
    schema.invitation,
    schema.member,
    schema.organization,
    schema.account,
    schema.session,
    schema.userEmail,
    schema.twoFactor,
    schema.passkey,
    schema.verification,
    schema.user,
  ];

  for (const table of tables) {
    try {
      await db.delete(table);
    } catch {
      // Table may not exist yet
    }
  }

  console.log("Cleared existing data");

  const now = new Date();
  const hashedPassword = await hashPassword("password123");

  // Create users
  const users = [
    {
      id: "user_alice",
      name: "Alice Johnson",
      email: "alice@example.com",
      emailVerified: true,
      createdAt: now,
      updatedAt: now,
      timezone: "America/New_York",
      appearance: "light" as const,
    },
    {
      id: "user_bob",
      name: "Bob Smith",
      email: "bob@example.com",
      emailVerified: true,
      createdAt: now,
      updatedAt: now,
      timezone: "America/Los_Angeles",
      appearance: "dark" as const,
    },
    {
      id: "user_charlie",
      name: "Charlie Brown",
      email: "charlie@example.com",
      emailVerified: true,
      createdAt: now,
      updatedAt: now,
      timezone: "Europe/London",
      appearance: "system" as const,
    },
    {
      id: "user_diana",
      name: "Diana Prince",
      email: "diana@example.com",
      emailVerified: false,
      createdAt: now,
      updatedAt: now,
      timezone: "UTC",
      appearance: "system" as const,
    },
    {
      id: "user_eve",
      name: "Eve Wilson",
      email: "eve@example.com",
      emailVerified: true,
      createdAt: now,
      updatedAt: now,
      timezone: "Asia/Tokyo",
      appearance: "light" as const,
    },
  ];

  await db.insert(schema.user).values(users);
  console.log(`Created ${users.length} users`);

  // Create accounts with passwords for each user
  const accounts = users.map((user) => ({
    id: `account_${user.id}`,
    accountId: user.id,
    providerId: "credential",
    userId: user.id,
    password: hashedPassword,
    createdAt: now,
    updatedAt: now,
  }));

  await db.insert(schema.account).values(accounts);
  console.log(`Created ${accounts.length} accounts`);

  // Create user emails
  const userEmails = users.map((user) => ({
    id: `email_${user.id}`,
    userId: user.id,
    email: user.email,
    verified: user.emailVerified,
    primary: true,
    createdAt: now,
  }));

  await db.insert(schema.userEmail).values(userEmails);
  console.log(`Created ${userEmails.length} user emails`);

  // Create organizations
  const organizations = [
    {
      id: "org_acme",
      name: "Acme Corporation",
      slug: "acme",
      logo: null,
      createdAt: now,
      metadata: JSON.stringify({ industry: "Technology" }),
    },
    {
      id: "org_globex",
      name: "Globex Industries",
      slug: "globex",
      logo: null,
      createdAt: now,
      metadata: JSON.stringify({ industry: "Manufacturing" }),
    },
    {
      id: "org_initech",
      name: "Initech",
      slug: "initech",
      logo: null,
      createdAt: now,
      metadata: JSON.stringify({ industry: "Consulting" }),
    },
  ];

  await db.insert(schema.organization).values(organizations);
  console.log(`Created ${organizations.length} organizations`);

  // Update users with default organization
  await db
    .update(schema.user)
    .set({ defaultOrganizationId: "org_acme" })
    .where(inArray(schema.user.id, ["user_alice", "user_bob", "user_charlie"]));

  await db
    .update(schema.user)
    .set({ defaultOrganizationId: "org_globex" })
    .where(inArray(schema.user.id, ["user_diana"]));

  // Create members with different roles
  const members = [
    // Acme Corporation members
    {
      id: "member_alice_acme",
      organizationId: "org_acme",
      userId: "user_alice",
      role: "owner",
      createdAt: now,
    },
    {
      id: "member_bob_acme",
      organizationId: "org_acme",
      userId: "user_bob",
      role: "admin",
      createdAt: now,
    },
    {
      id: "member_charlie_acme",
      organizationId: "org_acme",
      userId: "user_charlie",
      role: "member",
      createdAt: now,
    },

    // Globex Industries members
    {
      id: "member_diana_globex",
      organizationId: "org_globex",
      userId: "user_diana",
      role: "owner",
      createdAt: now,
    },
    {
      id: "member_eve_globex",
      organizationId: "org_globex",
      userId: "user_eve",
      role: "admin",
      createdAt: now,
    },
    {
      id: "member_alice_globex",
      organizationId: "org_globex",
      userId: "user_alice",
      role: "member",
      createdAt: now,
    },

    // Initech members
    {
      id: "member_eve_initech",
      organizationId: "org_initech",
      userId: "user_eve",
      role: "owner",
      createdAt: now,
    },
    {
      id: "member_bob_initech",
      organizationId: "org_initech",
      userId: "user_bob",
      role: "member",
      createdAt: now,
    },
  ];

  await db.insert(schema.member).values(members);
  console.log(`Created ${members.length} organization members`);

  // Create teams
  const teams = [
    // Acme teams
    {
      id: "team_acme_engineering",
      name: "Engineering",
      organizationId: "org_acme",
      createdAt: now,
      updatedAt: now,
    },
    {
      id: "team_acme_design",
      name: "Design",
      organizationId: "org_acme",
      createdAt: now,
      updatedAt: now,
    },
    {
      id: "team_acme_marketing",
      name: "Marketing",
      organizationId: "org_acme",
      createdAt: now,
      updatedAt: now,
    },

    // Globex teams
    {
      id: "team_globex_operations",
      name: "Operations",
      organizationId: "org_globex",
      createdAt: now,
      updatedAt: now,
    },
    {
      id: "team_globex_sales",
      name: "Sales",
      organizationId: "org_globex",
      createdAt: now,
      updatedAt: now,
    },

    // Initech teams
    {
      id: "team_initech_consulting",
      name: "Consulting",
      organizationId: "org_initech",
      createdAt: now,
      updatedAt: now,
    },
  ];

  await db.insert(schema.team).values(teams);
  console.log(`Created ${teams.length} teams`);

  // Create team members
  const teamMembers = [
    // Acme Engineering team
    {
      id: "tm_alice_eng",
      teamId: "team_acme_engineering",
      userId: "user_alice",
      createdAt: now,
    },
    {
      id: "tm_bob_eng",
      teamId: "team_acme_engineering",
      userId: "user_bob",
      createdAt: now,
    },

    // Acme Design team
    {
      id: "tm_charlie_design",
      teamId: "team_acme_design",
      userId: "user_charlie",
      createdAt: now,
    },
    {
      id: "tm_alice_design",
      teamId: "team_acme_design",
      userId: "user_alice",
      createdAt: now,
    },

    // Acme Marketing team
    {
      id: "tm_bob_marketing",
      teamId: "team_acme_marketing",
      userId: "user_bob",
      createdAt: now,
    },

    // Globex Operations team
    {
      id: "tm_diana_ops",
      teamId: "team_globex_operations",
      userId: "user_diana",
      createdAt: now,
    },
    {
      id: "tm_eve_ops",
      teamId: "team_globex_operations",
      userId: "user_eve",
      createdAt: now,
    },

    // Globex Sales team
    {
      id: "tm_alice_sales",
      teamId: "team_globex_sales",
      userId: "user_alice",
      createdAt: now,
    },

    // Initech Consulting team
    {
      id: "tm_eve_consulting",
      teamId: "team_initech_consulting",
      userId: "user_eve",
      createdAt: now,
    },
    {
      id: "tm_bob_consulting",
      teamId: "team_initech_consulting",
      userId: "user_bob",
      createdAt: now,
    },
  ];

  await db.insert(schema.teamMember).values(teamMembers);
  console.log(`Created ${teamMembers.length} team members`);

  // Create some pending invitations
  const invitations = [
    {
      id: "inv_frank_acme",
      organizationId: "org_acme",
      email: "frank@example.com",
      role: "member",
      status: "pending",
      expiresAt: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000), // 7 days
      createdAt: now,
      inviterId: "user_alice",
    },
    {
      id: "inv_grace_globex",
      organizationId: "org_globex",
      email: "grace@example.com",
      role: "admin",
      teamId: "team_globex_sales",
      status: "pending",
      expiresAt: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000),
      createdAt: now,
      inviterId: "user_diana",
    },
  ];

  await db.insert(schema.invitation).values(invitations);
  console.log(`Created ${invitations.length} invitations`);

  // Create notifications
  const notifications = [
    // Alice — Acme owner
    {
      id: "notif_1",
      userId: "user_alice",
      organizationId: "org_acme",
      type: "member.joined",
      title: "Bob Smith joined Acme Corporation",
      body: "Bob was added as an admin.",
      link: "/acme/settings?tab=members",
      read: true,
      createdAt: new Date(now.getTime() - 3 * 24 * 60 * 60 * 1000),
    },
    {
      id: "notif_2",
      userId: "user_alice",
      organizationId: "org_acme",
      type: "member.joined",
      title: "Charlie Brown joined Acme Corporation",
      body: "Charlie was added as a member.",
      link: "/acme/settings?tab=members",
      read: true,
      createdAt: new Date(now.getTime() - 2 * 24 * 60 * 60 * 1000),
    },
    {
      id: "notif_3",
      userId: "user_alice",
      organizationId: "org_globex",
      type: "invitation.received",
      title: "You've been invited to Globex Industries",
      body: "Diana invited you as a member.",
      link: "/globex",
      read: true,
      createdAt: new Date(now.getTime() - 1 * 24 * 60 * 60 * 1000),
    },
    {
      id: "notif_4",
      userId: "user_alice",
      organizationId: "org_acme",
      type: "billing.updated",
      title: "Billing email updated",
      body: "The billing email for Acme Corporation was changed.",
      link: "/acme/settings?tab=billing",
      read: false,
      createdAt: new Date(now.getTime() - 2 * 60 * 60 * 1000),
    },
    {
      id: "notif_5",
      userId: "user_alice",
      organizationId: "org_acme",
      type: "member.role_updated",
      title: "Bob Smith's role was updated",
      body: "Bob is now an admin of Acme Corporation.",
      link: "/acme/settings?tab=members",
      read: false,
      createdAt: new Date(now.getTime() - 30 * 60 * 1000),
    },

    // Bob — admin at Acme, member at Initech
    {
      id: "notif_6",
      userId: "user_bob",
      organizationId: "org_acme",
      type: "invitation.received",
      title: "You've been invited to Acme Corporation",
      body: "Alice invited you as an admin.",
      link: "/acme",
      read: true,
      createdAt: new Date(now.getTime() - 5 * 24 * 60 * 60 * 1000),
    },
    {
      id: "notif_7",
      userId: "user_bob",
      organizationId: "org_initech",
      type: "invitation.received",
      title: "You've been invited to Initech",
      body: "Eve invited you as a member.",
      link: "/initech",
      read: true,
      createdAt: new Date(now.getTime() - 4 * 24 * 60 * 60 * 1000),
    },
    {
      id: "notif_8",
      userId: "user_bob",
      organizationId: "org_acme",
      type: "member.joined",
      title: "Charlie Brown joined Acme Corporation",
      body: null,
      link: "/acme/settings?tab=members",
      read: false,
      createdAt: new Date(now.getTime() - 6 * 60 * 60 * 1000),
    },

    // Charlie — member at Acme
    {
      id: "notif_9",
      userId: "user_charlie",
      organizationId: "org_acme",
      type: "invitation.received",
      title: "You've been invited to Acme Corporation",
      body: "Alice invited you as a member.",
      link: "/acme",
      read: true,
      createdAt: new Date(now.getTime() - 2 * 24 * 60 * 60 * 1000),
    },

    // Diana — owner at Globex
    {
      id: "notif_10",
      userId: "user_diana",
      organizationId: "org_globex",
      type: "member.joined",
      title: "Eve Wilson joined Globex Industries",
      body: "Eve was added as an admin.",
      link: "/globex/settings?tab=members",
      read: true,
      createdAt: new Date(now.getTime() - 3 * 24 * 60 * 60 * 1000),
    },
    {
      id: "notif_11",
      userId: "user_diana",
      organizationId: "org_globex",
      type: "member.joined",
      title: "Alice Johnson joined Globex Industries",
      body: null,
      link: "/globex/settings?tab=members",
      read: false,
      createdAt: new Date(now.getTime() - 12 * 60 * 60 * 1000),
    },

    // Eve — owner at Initech, admin at Globex
    {
      id: "notif_12",
      userId: "user_eve",
      organizationId: "org_initech",
      type: "member.joined",
      title: "Bob Smith joined Initech",
      body: "Bob was added as a member.",
      link: "/initech/settings?tab=members",
      read: false,
      createdAt: new Date(now.getTime() - 1 * 24 * 60 * 60 * 1000),
    },
    {
      id: "notif_13",
      userId: "user_eve",
      organizationId: "org_globex",
      type: "invitation.received",
      title: "You've been invited to Globex Industries",
      body: "Diana invited you as an admin.",
      link: "/globex",
      read: true,
      createdAt: new Date(now.getTime() - 4 * 24 * 60 * 60 * 1000),
    },
  ];

  await db.insert(schema.notification).values(notifications);
  console.log(`Created ${notifications.length} notifications`);

  console.log("\nSeed complete!");
  console.log("\nTest accounts (password: password123):");
  users.forEach((user) => {
    console.log(`  - ${user.email}`);
  });

  console.log("\nOrganizations:");
  organizations.forEach((org) => {
    console.log(`  - ${org.name} (${org.slug})`);
  });

  console.log("\nRoles:");
  console.log("  - owner: Full access, can delete organization");
  console.log("  - admin: Can manage members and settings");
  console.log("  - member: Basic access");
}

seed()
  .then(() => process.exit(0))
  .catch((error) => {
    console.error("Seed failed:", error);
    process.exit(1);
  });
