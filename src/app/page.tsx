import { redirect } from "next/navigation";
import { readSession } from "@/lib/auth/session";
import { LoginForm } from "@/components/login-form";
import { Brand } from "@/components/brand";

export const dynamic="force-dynamic";

export default async function Home(){
  const session=await readSession();
  if(session) redirect(session.role==="voter"?"/voter":"/admin");
  return <main className="login"><section className="login-panel"><Brand/><div className="login-main"><div className="eyebrow">Secure election access</div><h1>Your vote.<br/>Your voice.</h1><p className="lead">Use the credentials issued by your election organizer. Ballot content is never stored with your identity.</p><LoginForm/></div><p className="login-foot">Protected by encrypted, HTTP-only session controls · CivicBallot</p></section><aside className="login-visual"><blockquote>“Trust is not an extra feature of an election. It is the foundation.”</blockquote><p>Purpose-built election operations for universities, institutions, and organizations.</p></aside></main>;
}
