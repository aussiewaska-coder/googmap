import { pgTable, varchar, doublePrecision, integer, timestamp, text } from 'drizzle-orm/pg-core';

// Police reports table (for police-specific alerts)
export const policeReports = pgTable('police_reports', {
    alertId: varchar('alert_id', { length: 255 }).primaryKey(),
    type: varchar('type', { length: 50 }),
    subtype: varchar('subtype', { length: 50 }),
    latitude: doublePrecision('latitude'),
    longitude: doublePrecision('longitude'),
    street: varchar('street', { length: 255 }),
    city: varchar('city', { length: 255 }),
    alertReliability: integer('alert_reliability'),
    publishDatetimeUtc: timestamp('publish_datetime_utc'),
    createdAt: timestamp('created_at').defaultNow(),
});

// Traffic alerts table (for all alert types)
export const trafficAlerts = pgTable('traffic_alerts', {
    alertId: varchar('alert_id', { length: 255 }).primaryKey(),
    type: varchar('type', { length: 50 }),
    subtype: varchar('subtype', { length: 50 }),
    latitude: doublePrecision('latitude'),
    longitude: doublePrecision('longitude'),
    street: varchar('street', { length: 255 }),
    city: varchar('city', { length: 255 }),
    alertReliability: integer('alert_reliability'),
    alertConfidence: integer('alert_confidence'),
    description: text('description'),
    publishDatetimeUtc: timestamp('publish_datetime_utc'),
    createdAt: timestamp('created_at').defaultNow(),
});
