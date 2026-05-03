import { cookies } from "next/headers";
import jwt from "jsonwebtoken";
import { connect } from "@/config/dbconfig";
import UpgAdmin from "@/modules/models/UpgAdminModel";

type TokenPayload = {
  id?: string;
  nip?: string;
  role?: string;
};

export type SessionUser = {
  id: string | null;
  nip: string | null;
  role: string | null;
  unitKerja: string | null;
  name: string | null;
};

export async function getSessionUser(
  options: { includeProfile?: boolean } = {},
): Promise<SessionUser | null> {
  try {
    const token = (await cookies()).get("token")?.value;
    if (!token) return null;

    const payload = jwt.verify(
      token,
      process.env.TOKEN_SECRET!,
    ) as TokenPayload;

    const session: SessionUser = {
      id: payload.id ?? null,
      nip: payload.nip ?? null,
      role: payload.role ?? null,
      unitKerja: null,
      name: null,
    };

    if (!options.includeProfile || !payload.id) {
      return session;
    }

    await connect();
    const user = await UpgAdmin.findById(payload.id)
      .select("name unitKerja")
      .lean<{ name?: string; unitKerja?: string } | null>();

    if (!user) return session;

    return {
      ...session,
      name: user.name ?? null,
      unitKerja: user.unitKerja ?? null,
    };
  } catch {
    return null;
  }
}
