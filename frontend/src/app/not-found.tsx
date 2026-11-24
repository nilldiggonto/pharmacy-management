import Link from "next/link";
import { Cube } from "@phosphor-icons/react/dist/ssr";
import { Button } from "@/components/ui/button";

export default function NotFound() {
  return (
    <div className="flex min-h-screen flex-col items-center justify-center bg-[#000000] p-6 text-center">
      <div className="flex h-12 w-12 items-center justify-center rounded-2xl border border-[#272727] bg-[#181818] text-[#10b981]">
        <Cube size={24} weight="duotone" />
      </div>
      <h1 className="mt-4 heading-4 text-[#f5f5f4]">Page not found</h1>
      <p className="mt-2 max-w-md body-5 text-[#a8a29e]">
        The requested pharmacy route does not exist or has moved. Return to the isometric command dashboard.
      </p>
      <div className="mt-6">
        <Button variant="primary" asChild>
          <Link href="/">Back to Isometric View</Link>
        </Button>
      </div>
    </div>
  );
}

