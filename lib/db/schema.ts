import {
  pgTable,
  uuid,
  text,
  boolean,
  integer,
  numeric,
  timestamp,
  date,
  time,
  jsonb,
  pgEnum,
  uniqueIndex,
  index,
} from "drizzle-orm/pg-core";
import { relations } from "drizzle-orm";

export const habitCategoryEnum = pgEnum("habit_category", [
  "spiritual",
  "financial",
  "behavioral",
  "discipline",
]);

export const habitTypeEnum = pgEnum("habit_type", [
  "boolean",
  "threshold",
  "counter",
]);

export const habitFrequencyEnum = pgEnum("habit_frequency", [
  "daily",
  "weekly",
]);

export const logStatusEnum = pgEnum("log_status", [
  "completed",
  "missed",
  "skipped",
]);

export const alertLevelEnum = pgEnum("alert_level", [
  "gentle",
  "moderate",
  "urgent",
  "critical",
]);

/** Row id equals Supabase auth.users.id */
export const profiles = pgTable("profiles", {
  id: uuid("id").primaryKey(),
  email: text("email").notNull(),
  displayName: text("display_name").notNull().default(""),
  fcmToken: text("fcm_token"),
  timezone: text("timezone").notNull().default("Africa/Douala"),
  avatarUrl: text("avatar_url"),
  onboarded: boolean("onboarded").default(false),
  createdAt: timestamp("created_at").defaultNow().notNull(),
  updatedAt: timestamp("updated_at").defaultNow().notNull(),
});

export const habits = pgTable("habits", {
  id: uuid("id").primaryKey().defaultRandom(),
  userId: uuid("user_id")
    .notNull()
    .references(() => profiles.id, { onDelete: "cascade" }),

  name: text("name").notNull(),
  description: text("description"),
  /** Lucide icon name, e.g. Flame */
  iconKey: text("icon_key").notNull().default("CircleDot"),
  color: text("color").notNull(),

  category: habitCategoryEnum("category").notNull(),
  type: habitTypeEnum("type").notNull().default("boolean"),
  frequency: habitFrequencyEnum("frequency").notNull().default("daily"),

  thresholdValue: numeric("threshold_value", { precision: 12, scale: 2 }),
  thresholdUnit: text("threshold_unit"),

  targetCount: integer("target_count"),

  windowStart: time("window_start").default("05:00"),
  windowEnd: time("window_end").default("23:00"),

  isActive: boolean("is_active").default(true),
  isPinned: boolean("is_pinned").default(false),
  sortOrder: integer("sort_order").default(0),

  createdAt: timestamp("created_at").defaultNow().notNull(),
  updatedAt: timestamp("updated_at").defaultNow().notNull(),
});

export const streaks = pgTable("streaks", {
  id: uuid("id").primaryKey().defaultRandom(),
  habitId: uuid("habit_id")
    .notNull()
    .references(() => habits.id, { onDelete: "cascade" })
    .unique(),
  userId: uuid("user_id")
    .notNull()
    .references(() => profiles.id, { onDelete: "cascade" }),

  currentStreak: integer("current_streak").default(0).notNull(),
  longestStreak: integer("longest_streak").default(0).notNull(),
  totalCompletions: integer("total_completions").default(0).notNull(),
  lastCompletedAt: date("last_completed_at"),
  streakBrokenAt: timestamp("streak_broken_at"),

  updatedAt: timestamp("updated_at").defaultNow().notNull(),
});

export const habitLogs = pgTable(
  "habit_logs",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    habitId: uuid("habit_id")
      .notNull()
      .references(() => habits.id, { onDelete: "cascade" }),
    userId: uuid("user_id")
      .notNull()
      .references(() => profiles.id, { onDelete: "cascade" }),

    logDate: date("log_date").notNull(),
    status: logStatusEnum("status").notNull(),

    value: numeric("value", { precision: 12, scale: 2 }),
    count: integer("count").default(0),

    note: text("note"),
    completedAt: timestamp("completed_at"),

    createdAt: timestamp("created_at").defaultNow().notNull(),
  },
  (table) => ({
    uniqueHabitDay: uniqueIndex("habit_logs_habit_date_unique").on(
      table.habitId,
      table.logDate
    ),
    userDateIdx: index("habit_logs_user_date_idx").on(
      table.userId,
      table.logDate
    ),
  })
);

export const spendingEntries = pgTable("spending_entries", {
  id: uuid("id").primaryKey().defaultRandom(),
  userId: uuid("user_id")
    .notNull()
    .references(() => profiles.id, { onDelete: "cascade" }),

  amount: numeric("amount", { precision: 12, scale: 2 }).notNull(),
  currency: text("currency").default("XAF").notNull(),
  category: text("category"),
  description: text("description"),
  isNecessary: boolean("is_necessary").default(true),

  spentAt: timestamp("spent_at").defaultNow().notNull(),
  logDate: date("log_date").notNull(),

  createdAt: timestamp("created_at").defaultNow().notNull(),
});

export const spendingBudgets = pgTable("spending_budgets", {
  id: uuid("id").primaryKey().defaultRandom(),
  userId: uuid("user_id")
    .notNull()
    .references(() => profiles.id, { onDelete: "cascade" }),

  dailyLimit: numeric("daily_limit", { precision: 12, scale: 2 }),
  weeklyLimit: numeric("weekly_limit", { precision: 12, scale: 2 }),
  monthlyLimit: numeric("monthly_limit", { precision: 12, scale: 2 }),

  alertAtPercent: integer("alert_at_percent").default(80),
  currency: text("currency").default("XAF").notNull(),

  isActive: boolean("is_active").default(true),
  createdAt: timestamp("created_at").defaultNow().notNull(),
  updatedAt: timestamp("updated_at").defaultNow().notNull(),
});

export const savingsAccounts = pgTable("savings_accounts", {
  id: uuid("id").primaryKey().defaultRandom(),
  userId: uuid("user_id")
    .notNull()
    .references(() => profiles.id, { onDelete: "cascade" })
    .unique(),
  pinHash: text("pin_hash").notNull(),
  createdAt: timestamp("created_at").defaultNow().notNull(),
  updatedAt: timestamp("updated_at").defaultNow().notNull(),
});

export const savingsEntries = pgTable("savings_entries", {
  id: uuid("id").primaryKey().defaultRandom(),
  userId: uuid("user_id")
    .notNull()
    .references(() => profiles.id, { onDelete: "cascade" }),
  accountId: uuid("account_id")
    .notNull()
    .references(() => savingsAccounts.id, { onDelete: "cascade" }),
  amount: numeric("amount", { precision: 12, scale: 2 }).notNull(),
  note: text("note"),
  createdAt: timestamp("created_at").defaultNow().notNull(),
});

export const notificationConfigs = pgTable("notification_configs", {
  id: uuid("id").primaryKey().defaultRandom(),
  habitId: uuid("habit_id")
    .notNull()
    .references(() => habits.id, { onDelete: "cascade" })
    .unique(),
  userId: uuid("user_id")
    .notNull()
    .references(() => profiles.id, { onDelete: "cascade" }),

  firstAlertTime: time("first_alert_time").default("08:00"),
  moderateAlertHours: integer("moderate_alert_hours").default(4),
  urgentAlertMinutes: integer("urgent_alert_minutes").default(60),
  criticalAlertMinutes: integer("critical_alert_minutes").default(30),

  isEnabled: boolean("is_enabled").default(true),
  sound: text("sound").default("default"),
  vibrate: boolean("vibrate").default(true),

  createdAt: timestamp("created_at").defaultNow().notNull(),
  updatedAt: timestamp("updated_at").defaultNow().notNull(),
});

export const notificationLogs = pgTable(
  "notification_logs",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    userId: uuid("user_id")
      .notNull()
      .references(() => profiles.id, { onDelete: "cascade" }),
    habitId: uuid("habit_id").references(() => habits.id, {
      onDelete: "set null",
    }),

    level: alertLevelEnum("level").notNull(),
    title: text("title").notNull(),
    body: text("body").notNull(),
    sentAt: timestamp("sent_at").defaultNow().notNull(),
    logDate: date("log_date").notNull(),
    delivered: boolean("delivered").default(true),
  },
  (table) => ({
    uniqueAlert: uniqueIndex("notif_logs_unique_alert").on(
      table.habitId,
      table.logDate,
      table.level
    ),
  })
);

export type WeeklySummary = {
  totalHabits: number;
  completedDays: Record<string, number>;
  missedDays: Record<string, number>;
  completionRate: number;
  streaksAtRisk: string[];
  biggestWin: string | null;
  biggestStruggle: string | null;
  totalSpent: number;
  budgetStatus: "under" | "at" | "over";
  pornFreeDays: number;
};

export const weeklyReviews = pgTable("weekly_reviews", {
  id: uuid("id").primaryKey().defaultRandom(),
  userId: uuid("user_id")
    .notNull()
    .references(() => profiles.id, { onDelete: "cascade" }),

  weekStart: date("week_start").notNull(),
  weekEnd: date("week_end").notNull(),

  summary: jsonb("summary").$type<WeeklySummary | null>(),
  reflection: text("reflection"),
  score: integer("score"),
  mood: text("mood"),

  createdAt: timestamp("created_at").defaultNow().notNull(),
  updatedAt: timestamp("updated_at").defaultNow().notNull(),
});

export const accountabilityEvents = pgTable("accountability_events", {
  id: uuid("id").primaryKey().defaultRandom(),
  userId: uuid("user_id")
    .notNull()
    .references(() => profiles.id, { onDelete: "cascade" }),
  habitId: uuid("habit_id").references(() => habits.id, {
    onDelete: "set null",
  }),

  type: text("type").notNull(),
  description: text("description").notNull(),
  logDate: date("log_date").notNull(),

  createdAt: timestamp("created_at").defaultNow().notNull(),
});

export const profilesRelations = relations(profiles, ({ many }) => ({
  habits: many(habits),
  habitLogs: many(habitLogs),
  streaks: many(streaks),
  spendingEntries: many(spendingEntries),
  spendingBudgets: many(spendingBudgets),
  notificationConfigs: many(notificationConfigs),
  notificationLogs: many(notificationLogs),
  savingsAccounts: many(savingsAccounts),
  savingsEntries: many(savingsEntries),
  weeklyReviews: many(weeklyReviews),
  accountabilityEvents: many(accountabilityEvents),
}));

export const habitsRelations = relations(habits, ({ one, many }) => ({
  profile: one(profiles, { fields: [habits.userId], references: [profiles.id] }),
  streak: one(streaks, { fields: [habits.id], references: [streaks.habitId] }),
  logs: many(habitLogs),
  notificationConfig: one(notificationConfigs, {
    fields: [habits.id],
    references: [notificationConfigs.habitId],
  }),
}));

export const streaksRelations = relations(streaks, ({ one }) => ({
  habit: one(habits, { fields: [streaks.habitId], references: [habits.id] }),
  profile: one(profiles, { fields: [streaks.userId], references: [profiles.id] }),
}));

export const habitLogsRelations = relations(habitLogs, ({ one }) => ({
  habit: one(habits, { fields: [habitLogs.habitId], references: [habits.id] }),
  profile: one(profiles, { fields: [habitLogs.userId], references: [profiles.id] }),
}));

export const spendingEntriesRelations = relations(spendingEntries, ({ one }) => ({
  profile: one(profiles, {
    fields: [spendingEntries.userId],
    references: [profiles.id],
  }),
}));

export const savingsAccountsRelations = relations(savingsAccounts, ({ one, many }) => ({
  profile: one(profiles, { fields: [savingsAccounts.userId], references: [profiles.id] }),
  entries: many(savingsEntries),
}));

export const savingsEntriesRelations = relations(savingsEntries, ({ one }) => ({
  profile: one(profiles, { fields: [savingsEntries.userId], references: [profiles.id] }),
  account: one(savingsAccounts, {
    fields: [savingsEntries.accountId],
    references: [savingsAccounts.id],
  }),
}));

export const notificationConfigsRelations = relations(
  notificationConfigs,
  ({ one }) => ({
    habit: one(habits, {
      fields: [notificationConfigs.habitId],
      references: [habits.id],
    }),
    profile: one(profiles, {
      fields: [notificationConfigs.userId],
      references: [profiles.id],
    }),
  })
);
