import { NextRequest, NextResponse } from "next/server";
import dbConnect from "../../../../lib/db";
import storeItemModel from "../../../../lib/models/storeItem.model";
import { withAdminAuth } from "../../../../lib/admin/middleware";

export const GET = withAdminAuth(async () => {
  await dbConnect();
  const items = await storeItemModel.find().sort({ sortOrder: 1, category: 1 }).lean();
  return NextResponse.json(items);
});

export const POST = withAdminAuth(async (request: NextRequest) => {
  await dbConnect();
  const body = await request.json();
  const { name, description, category, subtype, priceUsd, quantity, active, sortOrder } = body;

  if (!name || !category || !priceUsd) {
    return NextResponse.json({ message: "name, category, and priceUsd are required" }, { status: 400 });
  }

  const item = await storeItemModel.create({
    name,
    description: description || "",
    category,
    subtype: subtype || undefined,
    priceUsd,
    quantity: quantity || 1,
    active: active !== undefined ? active : true,
    sortOrder: sortOrder || 0,
  });

  return NextResponse.json(item);
});

export const PATCH = withAdminAuth(async (request: NextRequest) => {
  await dbConnect();
  const { searchParams } = new URL(request.url);
  const id = searchParams.get("id");
  if (!id) return NextResponse.json({ message: "id required" }, { status: 400 });

  const body = await request.json();
  const update: Record<string, any> = {};
  const allowed = ["name", "description", "category", "subtype", "priceUsd", "quantity", "active", "sortOrder"];
  for (const key of allowed) {
    if (body[key] !== undefined) update[key] = body[key];
  }

  const item = await storeItemModel.findByIdAndUpdate(id, { $set: update }, { new: true });
  if (!item) return NextResponse.json({ message: "Item not found" }, { status: 404 });
  return NextResponse.json(item);
});

export const DELETE = withAdminAuth(async (request: NextRequest) => {
  await dbConnect();
  const { searchParams } = new URL(request.url);
  const id = searchParams.get("id");
  if (!id) return NextResponse.json({ message: "id required" }, { status: 400 });

  await storeItemModel.findByIdAndDelete(id);
  return NextResponse.json({ success: true });
});
