import { connect } from "@/config/dbconfig";

export async function GET() {
  await connect();
  return Response.json({ message: "MongoDB connected successfully" });
}
