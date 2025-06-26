import { useEffect, useRef } from "react";
import { useLocation, useNavigationType } from "react-router-dom";

const ScrollManager = () => {
  const { pathname } = useLocation();
  const navigationType = useNavigationType();
  const prevPathRef = useRef(null);

  useEffect(() => {
    const keepScrollPaths = ["/", "/search", "/collections/", "/collection/"];

    const shouldRememberScroll = keepScrollPaths.some(path =>
      pathname === path || pathname.startsWith(path)
    );

    // If path is NOT in keepScrollPaths, reset scroll to top unless coming from back (POP)
    if (!shouldRememberScroll && navigationType !== "POP") {
      window.scrollTo({ top: 0, left: 0, behavior: "instant" });
    }

    // Special case: Always scroll to top for policy pages
    if (
      ["/terms-and-conditions", "/privacy-policy", "/return-policy"].includes(pathname)
    ) {
      window.scrollTo({ top: 0, left: 0, behavior: "instant" });
    }

    prevPathRef.current = pathname;
  }, [pathname, navigationType]);

  return null;
};

export default ScrollManager;
