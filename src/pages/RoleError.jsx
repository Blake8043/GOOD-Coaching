import { useAuth } from "../context/AuthContext";

export default function RoleError() {
  const { user, signout } = useAuth();
  return <div className="pp-page grid min-h-screen place-items-center px-6 py-32"><div className="max-w-xl rounded-[2rem] border border-[#b91c1c]/20 bg-white p-8 text-center shadow-xl"><div className="mx-auto inline-flex rounded-full bg-[#b91c1c] px-4 py-2 text-xs font-black uppercase tracking-wider text-white">Role unavailable</div><h1 className="mt-5 text-3xl font-black text-[#12372a]">This account needs a valid role.</h1><p className="mt-3 leading-7 text-[#40584f]">The account for {user?.email || "this user"} is not marked as a customer, coach, or admin. No customer dashboard was opened automatically. Ask an administrator to correct the role in MongoDB, then sign in again.</p><button onClick={signout} className="pp-btn-primary mt-6 px-5 py-3">Sign out</button></div></div>;
}
