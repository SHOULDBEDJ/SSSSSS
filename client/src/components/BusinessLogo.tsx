import { useEffect, useState } from "react";
import { Tent } from "lucide-react";
import { localDataService } from "@/services/localDataService";
import { cn } from "@/lib/utils";

let cachedUrl: string | null | undefined; // undefined = not loaded, null = no logo
const subscribers: ((u: string | null) => void)[] = [];

const loadLogo = async () => {
  const data = localDataService.getAll("business_profile")[0];
  cachedUrl = data?.photo_url || null;
  subscribers.forEach((fn) => fn(cachedUrl!));
  return cachedUrl;
};

export const useBusinessLogo = () => {
  const [url, setUrl] = useState<string | null>(cachedUrl ?? null);
  useEffect(() => {
    const sub = (u: string | null) => setUrl(u);
    subscribers.push(sub);
    if (cachedUrl === undefined) loadLogo();
    else setUrl(cachedUrl);
    return () => {
      const i = subscribers.indexOf(sub);
      if (i >= 0) subscribers.splice(i, 1);
    };
  }, []);
  return url;
};

export const refreshBusinessLogo = () => loadLogo();

export const BusinessLogo = ({ size = 40, className }: { size?: number; className?: string }) => {
  const url = useBusinessLogo();
  return (
    <div
      className={cn(
        "rounded-lg overflow-hidden bg-gradient-marigold grid place-items-center shadow-glow flex-shrink-0",
        className
      )}
      style={{ height: size, width: size }}
    >
      {url ? (
        <img src={url} alt="Logo" className="h-full w-full object-cover" />
      ) : (
        <img src="/logo.png" alt="Logo" className="h-full w-full object-cover" onError={(e) => {
          e.currentTarget.style.display = 'none';
          e.currentTarget.parentElement?.classList.add('bg-gradient-marigold');
        }} />
      )}
    </div>
  );
};
