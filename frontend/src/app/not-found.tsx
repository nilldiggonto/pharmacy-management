import Link from "next/link";
import { FirstAidKit } from "@phosphor-icons/react/dist/ssr";

export default function NotFound() {
  return (
    <div className="flex min-h-screen flex-col items-center justify-center bg-[#ffffff] p-6 text-center text-[#0a0a0a]">
      <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-[#fff0f6] text-[#ff1f7a]">
        <FirstAidKit size={24} weight="fill" />
      </div>
      <h1 className="mt-4 heading-4 text-[#0a0a0a]">Page not found</h1>
      <p className="mt-2 max-w-md body-5 text-[#525252]">
        The requested page does not exist or has moved. Return to the MedGrid Pharmacy homepage.
      </p>
      <div className="mt-6">
        <Link
          href="/"
          className="inline-flex items-center rounded-lg bg-[#ff1f7a] px-4 py-2.5 button-sm text-[#ffffff] transition-colors duration-300 hover:bg-[#e11d74]"
        >
          Back to Homepage
        </Link>
      </div>
    </div>
  );
}
