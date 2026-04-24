import { NextRequest, NextResponse } from "next/server";
import { requireOwner } from "@/lib/adminAuth";
import { sql } from "@/lib/db";

export async function GET(req: NextRequest) {
  const sessionOrResponse = await requireOwner(req);
  if (sessionOrResponse instanceof NextResponse) return sessionOrResponse;

  const users = await sql`
    SELECT au.id, au.name, au.email, au.role, au.active, au.created_at,
           json_agg(json_build_object(
             'id', wc.id,
             'credential_id', wc.credential_id,
             'device_name', wc.device_name,
             'created_at', wc.created_at
           )) FILTER (WHERE wc.id IS NOT NULL) as credentials
    FROM admin_users au
    LEFT JOIN webauthn_credentials wc ON wc.user_id = au.id
    GROUP BY au.id
    ORDER BY au.created_at ASC
  `;

  return NextResponse.json(users);
}
