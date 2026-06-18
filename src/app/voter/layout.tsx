import { Brand } from "@/components/brand";
import { LogoutButton } from "@/components/logout-button";
import { requireRole } from "@/lib/auth/session";
export default async function VoterLayout({children}:{children:React.ReactNode}){const session=await requireRole("voter");const initials=session.name.split(" ").map(x=>x[0]).slice(0,2).join("");return <><header className="topbar"><Brand/><div className="top-actions"><span className="secure">Secure session</span><LogoutButton/><span className="avatar">{initials}</span></div></header>{children}</>}
