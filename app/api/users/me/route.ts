import { NextRequest, NextResponse } from "next/server";
import dbConnect from "../../../lib/db";
import { authenticateUser } from "../../../lib/auth";
import UserService from "../../../lib/services/users.service";

export async function GET(request: NextRequest) {
  try {
    await dbConnect();
    
    const user = await authenticateUser(request);
    const userService = new UserService();
    
    const userData = await userService.createUser(user);
    
    return NextResponse.json(userData);
  } catch (error: any) {
    console.error("Authentication error:", error);
    return NextResponse.json(
      { message: error.message || "Authentication failed" },
      { status: 401 }
    );
  }
}