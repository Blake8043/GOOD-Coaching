import PrimaryButton from "./PrimaryButton";
import { PhoneCall, CreditCard } from "lucide-react";

export default function FooterBanner() {
  return (
    <div className="bg-gradient-to-r from-green-700 via-green-600 to-green-700 py-8 shadow-inner">
      <div className="max-w-5xl mx-auto flex flex-wrap justify-center gap-6">
        <PrimaryButton href="/contact">
          <PhoneCall size={18} />
          Book Service
        </PrimaryButton>
        <PrimaryButton href="/payments">
          <CreditCard size={18} />
          Pay Bill
        </PrimaryButton>
      </div>
    </div>
  );
}
