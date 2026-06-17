"use client";
import { useState } from "react";
import { useRouter } from "next/navigation";

export function LoginForm(){
  const [role,setRole]=useState<"voter"|"admin">("voter");
  const [error,setError]=useState("");
  const [busy,setBusy]=useState(false);
  const router=useRouter();
  async function submit(e:React.FormEvent<HTMLFormElement>){
    e.preventDefault();setBusy(true);setError("");
    const form=new FormData(e.currentTarget);
    const res=await fetch("/api/auth/login",{method:"POST",headers:{"content-type":"application/json"},body:JSON.stringify({role,identity:form.get("identity"),password:form.get("password"),organization:form.get("organization")})});
    const data=await res.json();setBusy(false);
    if(!res.ok){setError(data.error||"Unable to sign in");return}
    router.push(role==="voter"?"/voter":"/admin");router.refresh();
  }
  return <><div className="role-tabs"><button type="button" className={`role-tab ${role==="voter"?"active":""}`} onClick={()=>setRole("voter")}>Voter</button><button type="button" className={`role-tab ${role==="admin"?"active":""}`} onClick={()=>setRole("admin")}>Administrator</button></div>{error&&<div className="error" role="alert">{error}</div>}<form onSubmit={submit}><div className="field"><label htmlFor="organization">Organization code</label><input id="organization" name="organization" autoComplete="organization" required placeholder="e.g. national-university"/></div><div className="field"><label htmlFor="identity">{role==="voter"?"Voter ID":"Email address"}</label><input id="identity" name="identity" autoComplete="username" required/></div><div className="field"><label htmlFor="password">Password</label><input id="password" name="password" type="password" autoComplete="current-password" required/></div><button className="btn btn-primary btn-block" disabled={busy}>{busy?"Verifying…":role==="voter"?"Verify and continue →":"Open control center →"}</button></form></>;
}
