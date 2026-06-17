import "server-only";
import { cookies } from "next/headers";
import { SignJWT, jwtVerify } from "jose";
import { redirect } from "next/navigation";

export type Session={sub:string;role:"voter"|"admin"|"owner"|"auditor";organizationId:string;name:string};
const key=()=>new TextEncoder().encode(process.env.SESSION_SECRET||"development-secret-change-before-production");
export async function createSession(session:Session){const token=await new SignJWT(session).setProtectedHeader({alg:"HS256"}).setIssuedAt().setExpirationTime("8h").sign(key());(await cookies()).set("cb_session",token,{httpOnly:true,secure:process.env.NODE_ENV==="production",sameSite:"strict",path:"/",maxAge:60*60*8})}
export async function readSession():Promise<Session|null>{const token=(await cookies()).get("cb_session")?.value;if(!token)return null;try{const {payload}=await jwtVerify(token,key());return payload as unknown as Session}catch{return null}}
export async function clearSession(){(await cookies()).delete("cb_session")}
export async function requireRole(role:"voter"|"admin"){const session=await readSession();if(!session||(role==="voter"?session.role!=="voter":session.role==="voter"))redirect("/");return session}
