import { Link, useLocation } from "react-router-dom";
import { useEffect, useState } from "react";
import { FaBars, FaTimes } from "react-icons/fa";
import AccountMenu from "./AccountMenu";
import BrandLogo from "./BrandLogo";
import { useAuth } from "../context/AuthContext";
import { portalLabelForRole, portalPathForRole } from "../lib/roles";

export default function Header() {
  const { pathname } = useLocation();
  const [scrolled, setScrolled] = useState(false);
  const [open, setOpen] = useState(false);
  const { user } = useAuth();

  useEffect(() => {
    const onScroll = () => setScrolled(window.scrollY > 24);
    onScroll();
    window.addEventListener("scroll", onScroll);
    return () => window.removeEventListener("scroll", onScroll);
  }, []);

  useEffect(() => setOpen(false), [pathname]);

  const links = [
    { name: "Coaches", to: "/coaches" },
    { name: "Training Options", to: "/services" },
    { name: "Become a Coach", to: "/coach-signup" },
    { name: "FAQ", to: "/faq" },
  ];

  const navLink = (link) => {
    const active = pathname === link.to || (link.to === "/coaches" && pathname.startsWith("/coaches"));

    return (
      <Link
        key={link.to}
        to={link.to}
        className={`rounded-full px-4 py-2 text-sm font-extrabold transition ${
          active
            ? "bg-[#c6ff4a] text-[#12372a] shadow-sm"
            : "text-[#12372a]/80 hover:bg-white/80 hover:text-[#12372a]"
        }`}
      >
        {link.name}
      </Link>
    );
  };

  return (
    <header
      className={`fixed left-0 top-0 z-50 w-full transition ${
        scrolled || open
          ? "border-b border-[#12372a]/10 bg-[#fff8e7]/95 shadow-lg shadow-[#12372a]/5 backdrop-blur-xl"
          : "bg-gradient-to-b from-[#fff8e7]/95 via-[#fff8e7]/75 to-transparent"
      }`}
    >
      <div className="mx-auto flex max-w-7xl items-center justify-between px-4 py-3 md:px-6">
        <BrandLogo imageClassName="h-12" />

        <nav className="hidden items-center gap-1 rounded-full border border-[#12372a]/10 bg-white/60 p-1 backdrop-blur lg:flex">
          {links.map(navLink)}
        </nav>

        <div className="hidden items-center gap-3 lg:flex">
          {!user ? (
            <Link to="/signin" className="text-sm font-extrabold text-[#12372a]/80 hover:text-[#12372a]">
              Sign In
            </Link>
          ) : (
            <AccountMenu />
          )}

          <Link to={user ? portalPathForRole(user.role) : "/coaches"} className="pp-btn-primary px-5 py-2.5 text-sm">
            {user ? portalLabelForRole(user.role) : "Request Coaching"}
          </Link>
        </div>

        <button
          onClick={() => setOpen((v) => !v)}
          className="inline-flex h-11 w-11 items-center justify-center rounded-full border border-[#12372a]/15 bg-white/70 text-[#12372a] shadow-sm lg:hidden"
          aria-label="Open navigation"
        >
          {open ? <FaTimes /> : <FaBars />}
        </button>
      </div>

      {open && (
        <div className="border-t border-[#12372a]/10 bg-[#fff8e7]/98 px-4 py-4 backdrop-blur-xl lg:hidden">
          <nav className="mx-auto grid max-w-7xl gap-2">
            {links.map(navLink)}

            <div className="mt-3 flex flex-wrap items-center gap-3 border-t border-[#12372a]/10 pt-4">
              {!user ? (
                <>
                  <Link to="/signin" className="rounded-full px-3 py-2 text-sm font-extrabold text-[#12372a]/85">
                    Sign In
                  </Link>

                  <Link to="/signup" className="rounded-full px-3 py-2 text-sm font-extrabold text-[#12372a]/85">
                    Sign Up
                  </Link>
                </>
              ) : (
                <AccountMenu />
              )}

              <Link to={user ? portalPathForRole(user.role) : "/coaches"} className="pp-btn-primary px-5 py-2.5 text-sm">
                {user ? portalLabelForRole(user.role) : "Request Coaching"}
              </Link>
            </div>
          </nav>
        </div>
      )}
    </header>
  );
}