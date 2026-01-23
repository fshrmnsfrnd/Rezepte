import { NextResponse } from "next/server";

export async function POST() {
  const response = NextResponse.json(
    { message: "Abmeldung erfolgreich" },
    { status: 200 }
  );

  // Clear the auth cookie
  response.cookies.delete("auth-token");

  return response;
}
