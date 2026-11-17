import { createClient as createAdminClient } from "@supabase/supabase-js";
import { deletePantryData } from "../../../lib/pantry-store";
import { createClient } from "../../../lib/supabase/server";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function DELETE(request: Request) {
  const supabase = await createClient();
  const { data, error: userError } = await supabase.auth.getUser();
  const user = data.user;

  if (userError || !user) {
    return Response.json({ error: "Sign in before deleting your account." }, { status: 401 });
  }

  let body: unknown;
  try {
    body = await request.json();
  } catch {
    body = null;
  }

  if (!body || typeof body !== "object" || (body as Record<string, unknown>).confirmation !== "DELETE") {
    return Response.json({ error: "Type DELETE to confirm account deletion." }, { status: 400 });
  }

  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const secretKey = process.env.SUPABASE_SECRET_KEY;
  if (!supabaseUrl || !secretKey) {
    return Response.json({ error: "Account deletion is not configured yet." }, { status: 503 });
  }

  try {
    await deletePantryData(user.id);

    const admin = createAdminClient(supabaseUrl, secretKey, {
      auth: { autoRefreshToken: false, persistSession: false },
    });
    const { error: deletionError } = await admin.auth.admin.deleteUser(user.id);
    if (deletionError) throw deletionError;

    await supabase.auth.signOut({ scope: "local" });
    return Response.json({ deleted: true });
  } catch (error) {
    console.error("Account deletion failed", error);
    return Response.json({ error: "We could not delete your account. Please try again." }, { status: 500 });
  }
}
