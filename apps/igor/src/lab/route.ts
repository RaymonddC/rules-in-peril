import { useEffect, useState } from "react";

// Hash routes, so the static build works on any host with no server rewrites.
export type Route =
  | { screen: "start" }
  | { screen: "lab" }
  | { screen: "autopsy"; monsterId: number }
  | { screen: "close-the-gap" }
  | { screen: "crypt" };

export function parseHash(hash: string): Route {
  const path = hash.replace(/^#\/?/, "");
  const [head, arg] = path.split("/");
  switch (head) {
    case "lab":
      return { screen: "lab" };
    case "autopsy": {
      const id = Number(arg);
      return Number.isInteger(id) ? { screen: "autopsy", monsterId: id } : { screen: "lab" };
    }
    case "close-the-gap":
      return { screen: "close-the-gap" };
    case "crypt":
      return { screen: "crypt" };
    default:
      return { screen: "start" };
  }
}

export function href(route: Route): string {
  switch (route.screen) {
    case "start":
      return "#/";
    case "autopsy":
      return `#/autopsy/${route.monsterId}`;
    default:
      return `#/${route.screen}`;
  }
}

export function go(route: Route): void {
  window.location.hash = href(route);
}

export function useRoute(): Route {
  const [route, setRoute] = useState<Route>(() => parseHash(window.location.hash));
  useEffect(() => {
    const onChange = () => {
      setRoute(parseHash(window.location.hash));
      window.scrollTo(0, 0);
    };
    window.addEventListener("hashchange", onChange);
    return () => window.removeEventListener("hashchange", onChange);
  }, []);
  return route;
}
