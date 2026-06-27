import { useEffect } from "react";
import { useLocation } from "react-router-dom";

const ScrollToHash = () => {
  const { pathname, hash } = useLocation();

  useEffect(() => {
    if (!hash) {
      window.scrollTo({ top: 0, behavior: "auto" });
      return;
    }

    const id = hash.replace("#", "");
    let attempts = 0;
    const maxAttempts = 30;

    const tryScroll = () => {
      const el = document.getElementById(id);
      if (el) {
        const navOffset = 96;
        const y = el.getBoundingClientRect().top + window.pageYOffset - navOffset;
        window.scrollTo({ top: y, behavior: "smooth" });
        return;
      }
      if (attempts++ < maxAttempts) {
        setTimeout(tryScroll, 100);
      }
    };

    tryScroll();
  }, [pathname, hash]);

  return null;
};

export default ScrollToHash;
