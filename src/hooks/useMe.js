import { useEffect, useState } from "react";
import { http } from "../api/http";
import { endpoints } from "../api/endpoints";

export function useMe() {
  const [me, setMe] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let ok = true;
    (async () => {
      try {
        const res = await http.get(endpoints.me);
        if (ok) setMe(res.data);
      } catch (e) {
        if (ok) setMe(null);
      } finally {
        if (ok) setLoading(false);
      }
    })();
    return () => {
      ok = false;
    };
  }, []);

  return { me, loading };
}