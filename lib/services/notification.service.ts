import { FarcasterNotificationToken } from "@/lib/models/farcasterNotificationToken.model";
import { NotificationLog } from "@/lib/models/notificationLog.model";
import axios from "axios";

export interface SendNotificationParams {
  title: string;
  body: string;
  targetUrl: string;
  type: string;
  date?: string;
}

export class NotificationService {
  private static BATCH_SIZE = 100;

  static async sendToAll(params: SendNotificationParams) {
    const { title, body, targetUrl, type, date } = params;

    // Check idempotency for daily
    if (type === "daily" && date) {
      const existing = await NotificationLog.findOne({ type: "daily", date });
      if (existing) {
        return { success: false, message: "Daily notification already sent for this date" };
      }
    }

    const tokens = await FarcasterNotificationToken.find({ enabled: true });
    if (tokens.length === 0) {
      return { success: true, message: "No enabled tokens found", recipientCount: 0 };
    }

    // Group by notificationUrl
    const urlGroups: Record<string, string[]> = {};
    tokens.forEach((t) => {
      if (t.notificationUrl) {
        if (!urlGroups[t.notificationUrl]) {
          urlGroups[t.notificationUrl] = [];
        }
        urlGroups[t.notificationUrl].push(t.token);
      }
    });

    let totalSuccess = 0;
    let totalFailure = 0;
    const invalidTokens: string[] = [];

    for (const [url, allTokens] of Object.entries(urlGroups)) {
      // Chunk tokens into batches of 100
      for (let i = 0; i < allTokens.length; i += this.BATCH_SIZE) {
        const batch = allTokens.slice(i, i + this.BATCH_SIZE);
        try {
          const response = await axios.post(url, {
            notificationId: `${type}-${date || Date.now()}-${i}`,
            title,
            body,
            targetUrl,
            tokens: batch,
          });

          totalSuccess += batch.length;

          // Check if response contains info about invalid tokens
          if (response.data && response.data.invalidTokens) {
            invalidTokens.push(...response.data.invalidTokens);
          }
        } catch (error: any) {
          console.error(`Error sending notification batch to ${url}:`, error.message);
          
          if (error.response) {
            const { status, data } = error.response;
            // If the whole batch is considered invalid or unauthorized
            if (status === 400 || status === 401 || status === 410) {
              invalidTokens.push(...batch);
              totalFailure += batch.length;
            } else if (data && data.invalidTokens) {
              invalidTokens.push(...data.invalidTokens);
              totalSuccess -= data.invalidTokens.length;
              totalFailure += data.invalidTokens.length;
            } else {
              totalFailure += batch.length;
            }
          } else {
            totalFailure += batch.length;
          }
        }
      }
    }

    // Delete invalid tokens
    if (invalidTokens.length > 0) {
      await FarcasterNotificationToken.deleteMany(
        { token: { $in: invalidTokens } }
      );
    }

    // Log the notification
    await NotificationLog.create({
      type,
      date,
      title,
      body,
      targetUrl,
      recipientCount: tokens.length,
      successCount: totalSuccess,
      failureCount: totalFailure,
    });

    return {
      success: true,
      recipientCount: tokens.length,
      successCount: totalSuccess,
      failureCount: totalFailure,
      invalidTokensCount: invalidTokens.length,
    };
  }

  static async sendToInactive(params: SendNotificationParams, inactiveDays: number = 3) {
    const { title, body, targetUrl, type } = params;

    const inactiveDate = new Date();
    inactiveDate.setDate(inactiveDate.getDate() - inactiveDays);

    // Find users who haven't played in inactiveDays
    // We use the User model to find inactive users who have an FID
    const mongoose = await import("mongoose");
    const User = mongoose.models.User;
    
    if (!User) {
        return { success: false, message: "User model not found" };
    }

    const inactiveUsers = await User.find({
      $or: [
        { lastLogin: { $lt: inactiveDate } },
        { lastPuzzleDate: { $lt: inactiveDate.toISOString().split('T')[0] } }
      ],
      fid: { $exists: true }
    });

    if (inactiveUsers.length === 0) {
      return { success: true, message: "No inactive users found", recipientCount: 0 };
    }

    const fids = inactiveUsers.map(u => u.fid);
    
    // Now find tokens for these FIDs
    const tokens = await FarcasterNotificationToken.find({ fid: { $in: fids }, enabled: true });
    
    if (tokens.length === 0) {
      return { success: true, message: "No enabled tokens found for inactive users", recipientCount: 0 };
    }

    // Group by notificationUrl
    const urlGroups: Record<string, string[]> = {};
    tokens.forEach((t) => {
      if (t.notificationUrl) {
        if (!urlGroups[t.notificationUrl]) {
          urlGroups[t.notificationUrl] = [];
        }
        urlGroups[t.notificationUrl].push(t.token);
      }
    });

    let totalSuccess = 0;
    let totalFailure = 0;
    const invalidTokens: string[] = [];

    for (const [url, allTokens] of Object.entries(urlGroups)) {
      for (let i = 0; i < allTokens.length; i += this.BATCH_SIZE) {
        const batch = allTokens.slice(i, i + this.BATCH_SIZE);
        try {
          const response = await axios.post(url, {
            notificationId: `${type}-${Date.now()}-${i}`,
            title,
            body,
            targetUrl,
            tokens: batch,
          });

          totalSuccess += batch.length;
          if (response.data && response.data.invalidTokens) {
            invalidTokens.push(...response.data.invalidTokens);
          }
        } catch (error: any) {
          if (error.response) {
            const { status, data } = error.response;
            if (status === 400 || status === 401 || status === 410) {
              invalidTokens.push(...batch);
              totalFailure += batch.length;
            } else if (data && data.invalidTokens) {
              invalidTokens.push(...data.invalidTokens);
              totalSuccess -= data.invalidTokens.length;
              totalFailure += data.invalidTokens.length;
            } else {
              totalFailure += batch.length;
            }
          } else {
            totalFailure += batch.length;
          }
        }
      }
    }

    if (invalidTokens.length > 0) {
      await FarcasterNotificationToken.deleteMany({ token: { $in: invalidTokens } });
    }

    await NotificationLog.create({
      type,
      title,
      body,
      targetUrl,
      recipientCount: tokens.length,
      successCount: totalSuccess,
      failureCount: totalFailure,
    });

    return {
      success: true,
      recipientCount: tokens.length,
      successCount: totalSuccess,
      failureCount: totalFailure,
      invalidTokensCount: invalidTokens.length,
    };
  }
}
