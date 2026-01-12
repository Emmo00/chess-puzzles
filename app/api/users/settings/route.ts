import { NextRequest, NextResponse } from "next/server";
import dbConnect from "../../../../lib/db";
import { authenticateWalletUser } from "../../../../lib/auth";
import UserService from "../../../../lib/services/users.service";
import { UserSettings } from "../../../../lib/types";

// GET /api/users/settings - Get user settings
export async function GET(request: NextRequest) {
  try {
    await dbConnect();
    
    const user = await authenticateWalletUser(request);
    const userService = new UserService();
    
    const settings = await userService.getUserSettings(user.walletAddress);
    
    return NextResponse.json(settings);
  } catch (error: any) {
    console.error("Error getting user settings:", error);
    return NextResponse.json(
      { message: error.message || "Failed to get user settings" },
      { status: error.status || 500 }
    );
  }
}

// PUT /api/users/settings - Update user settings
export async function PUT(request: NextRequest) {
  try {
    await dbConnect();
    
    const user = await authenticateWalletUser(request);
    const body = await request.json();
    
    const { ratingRange, disabledThemes } = body as Partial<UserSettings>;
    
    // Validate rating range
    if (ratingRange) {
      if (typeof ratingRange.min !== "number" || typeof ratingRange.max !== "number") {
        return NextResponse.json(
          { message: "Invalid rating range format" },
          { status: 400 }
        );
      }
      if (ratingRange.min > ratingRange.max) {
        return NextResponse.json(
          { message: "Minimum rating cannot be greater than maximum rating" },
          { status: 400 }
        );
      }
      if (ratingRange.min < 400 || ratingRange.max > 3000) {
        return NextResponse.json(
          { message: "Rating must be between 400 and 3000" },
          { status: 400 }
        );
      }
    }
    
    // Validate disabled themes (just needs to be an array)
    if (disabledThemes !== undefined && !Array.isArray(disabledThemes)) {
      return NextResponse.json(
        { message: "Disabled themes must be an array" },
        { status: 400 }
      );
    }
    
    const userService = new UserService();
    const updatedSettings = await userService.updateUserSettings(user.walletAddress, {
      ratingRange,
      disabledThemes,
    });
    
    return NextResponse.json(updatedSettings);
  } catch (error: any) {
    console.error("Error updating user settings:", error);
    return NextResponse.json(
      { message: error.message || "Failed to update user settings" },
      { status: error.status || 500 }
    );
  }
}
