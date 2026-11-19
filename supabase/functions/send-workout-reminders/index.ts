import { createClient } from "npm:@supabase/supabase-js@2";
import webpush from "npm:web-push@3.6.7";

type ReminderRow = {
  user_id: string;
  enabled: boolean;
  local_time: string;
  timezone: string;
  email_enabled: boolean;
  push_enabled: boolean;
  last_email_sent_date: string | null;
  last_push_sent_date: string | null;
  profiles: { email: string } | { email: string }[] | null;
};

function requiredSecret(name: string): string {
  const value = Deno.env.get(name);
  if (!value) throw new Error(`Missing Edge Function secret: ${name}`);
  return value;
}

function localClock(date: Date, timezone: string) {
  const parts = new Intl.DateTimeFormat("en-CA", {
    timeZone: timezone,
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
    hourCycle: "h23"
  }).formatToParts(date);
  const values = Object.fromEntries(parts.map((part) => [part.type, part.value]));
  return {
    date: `${values.year}-${values.month}-${values.day}`,
    time: `${values.hour}:${values.minute}`
  };
}

async function sendEmail(email: string, from: string, apiKey: string, appBaseUrl: string): Promise<void> {
  const workoutUrl = new URL("index.html#planner", appBaseUrl).href;
  const response = await fetch("https://api.resend.com/emails", {
    method: "POST",
    headers: {
      "Authorization": `Bearer ${apiKey}`,
      "Content-Type": "application/json"
    },
    body: JSON.stringify({
      from,
      to: [email],
      subject: "Time for your workout",
      text: "Your daily workout reminder is here. Open Form & Function and find a routine that fits your day.",
      html: `<p>Your daily workout reminder is here.</p><p>Open Form &amp; Function and find a routine that fits your day.</p><p><a href="${workoutUrl}">Build your workout</a></p>`
    })
  });
  if (!response.ok) {
    const details = await response.text();
    throw new Error(`Resend request failed (${response.status}): ${details}`);
  }
}

async function sendPush(
  supabase: ReturnType<typeof createClient>,
  userId: string,
  vapidSubject: string,
  vapidPublicKey: string,
  vapidPrivateKey: string,
  appBaseUrl: string
): Promise<void> {
  const { data: subscriptions, error } = await supabase
    .from("push_subscriptions")
    .select("id, subscription")
    .eq("user_id", userId);
  if (error) throw error;
  if (!subscriptions || subscriptions.length === 0) throw new Error("No push subscriptions are registered for this user.");

  webpush.setVapidDetails(vapidSubject, vapidPublicKey, vapidPrivateKey);
  const payload = JSON.stringify({
    title: "Workout reminder",
    body: "A little movement can make a big difference. Ready for your workout?",
    url: new URL("index.html#planner", appBaseUrl).href
  });
  let delivered = 0;
  for (const subscriptionRow of subscriptions) {
    try {
      await webpush.sendNotification(subscriptionRow.subscription, payload);
      delivered += 1;
    } catch (error) {
      const statusCode = error instanceof Error
        ? (error as Error & { statusCode?: number }).statusCode
        : undefined;
      if (statusCode === 404 || statusCode === 410) {
        const { error: deleteError } = await supabase
          .from("push_subscriptions")
          .delete()
          .eq("id", subscriptionRow.id);
        if (deleteError) throw deleteError;
      } else {
        throw error;
      }
    }
  }
  if (delivered === 0) throw new Error("All push subscriptions have expired or failed.");
}

Deno.serve(async (request) => {
  if (request.method !== "POST") return new Response("Method not allowed", { status: 405 });
  const cronSecret = Deno.env.get("CRON_SECRET");
  if (!cronSecret) {
    console.error("Missing Edge Function secret: CRON_SECRET");
    return Response.json({ error: "Reminder scheduler is not configured." }, { status: 500 });
  }
  if (request.headers.get("x-cron-secret") !== cronSecret) {
    return Response.json({ error: "Unauthorized." }, { status: 401 });
  }

  try {
    const supabaseUrl = requiredSecret("SUPABASE_URL");
    const serviceRoleKey = requiredSecret("SUPABASE_SERVICE_ROLE_KEY");
    const supabase = createClient(supabaseUrl, serviceRoleKey);
    const { data, error } = await supabase
      .from("workout_reminders")
      .select("user_id, enabled, local_time, timezone, email_enabled, push_enabled, last_email_sent_date, last_push_sent_date, profiles!workout_reminders_user_id_fkey(email)")
      .eq("enabled", true);
    if (error) throw error;

    const now = new Date();
    const totals = { due: 0, emailsSent: 0, pushesSent: 0, failures: 0 };
    const emailApiKey = Deno.env.get("RESEND_API_KEY");
    const emailFrom = Deno.env.get("EMAIL_FROM");
    const appBaseUrl = Deno.env.get("APP_BASE_URL");
    const vapidSubject = Deno.env.get("VAPID_SUBJECT");
    const vapidPublicKey = Deno.env.get("VAPID_PUBLIC_KEY");
    const vapidPrivateKey = Deno.env.get("VAPID_PRIVATE_KEY");

    for (const reminder of (data || []) as ReminderRow[]) {
      let local: ReturnType<typeof localClock>;
      try {
        local = localClock(now, reminder.timezone);
      } catch (error) {
        totals.failures += 1;
        console.error(`Could not resolve workout reminder time for user ${reminder.user_id}:`, error);
        continue;
      }
      const [localHour, localMinute] = local.time.split(":").map(Number);
      const [targetHour, targetMinute] = reminder.local_time.slice(0, 5).split(":").map(Number);
      const minutesPastReminder = localHour * 60 + localMinute - (targetHour * 60 + targetMinute);
      if (minutesPastReminder < 0 || minutesPastReminder > 15) continue;
      const emailDue = reminder.email_enabled && reminder.last_email_sent_date !== local.date;
      const pushDue = reminder.push_enabled && reminder.last_push_sent_date !== local.date;
      if (!emailDue && !pushDue) continue;
      totals.due += 1;

      const profile = Array.isArray(reminder.profiles) ? reminder.profiles[0] : reminder.profiles;
      if (emailDue) {
        try {
          if (!emailApiKey || !emailFrom || !appBaseUrl) throw new Error("Email reminders need RESEND_API_KEY, EMAIL_FROM, and APP_BASE_URL Edge Function secrets.");
          if (!profile || !profile.email) throw new Error("The account email is missing.");
          await sendEmail(profile.email, emailFrom, emailApiKey, appBaseUrl);
          const { error: markEmailError } = await supabase
            .from("workout_reminders")
            .update({ last_email_sent_date: local.date })
            .eq("user_id", reminder.user_id);
          if (markEmailError) throw markEmailError;
          totals.emailsSent += 1;
        } catch (error) {
          totals.failures += 1;
          console.error(`Workout email reminder failed for user ${reminder.user_id}:`, error);
        }
      }

      if (pushDue) {
        try {
          if (!vapidSubject || !vapidPublicKey || !vapidPrivateKey || !appBaseUrl) {
            throw new Error("Push reminders need VAPID_SUBJECT, VAPID_PUBLIC_KEY, VAPID_PRIVATE_KEY, and APP_BASE_URL Edge Function secrets.");
          }
          await sendPush(supabase, reminder.user_id, vapidSubject, vapidPublicKey, vapidPrivateKey, appBaseUrl);
          const { error: markPushError } = await supabase
            .from("workout_reminders")
            .update({ last_push_sent_date: local.date })
            .eq("user_id", reminder.user_id);
          if (markPushError) throw markPushError;
          totals.pushesSent += 1;
        } catch (error) {
          totals.failures += 1;
          console.error(`Workout push reminder failed for user ${reminder.user_id}:`, error);
        }
      }
    }

    return Response.json(totals);
  } catch (error) {
    console.error("Workout reminder scheduler failed:", error);
    return Response.json({ error: error instanceof Error ? error.message : "Reminder delivery failed." }, { status: 500 });
  }
});
