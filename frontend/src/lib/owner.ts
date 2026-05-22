export const OWNER_LOGIN = import.meta.env.VITE_OWNER_LOGIN ?? "cleber.super";
export const OWNER_EMAIL =
  import.meta.env.VITE_OWNER_EMAIL ?? "cleber.super@rrinfocell.com.br";
export const OWNER_SESSION_KEY = "rr.owner";

export const isOwnerLogin = (value: string) =>
  value.trim().toLowerCase() === OWNER_LOGIN.toLowerCase();

export const resolveLoginEmail = (value: string) =>
  isOwnerLogin(value) ? OWNER_EMAIL : value.trim();

export const setOwnerSession = (isOwner: boolean) => {
  if (isOwner) {
    localStorage.setItem(OWNER_SESSION_KEY, "true");
  } else {
    localStorage.removeItem(OWNER_SESSION_KEY);
  }
};

export const getOwnerSession = () =>
  typeof window !== "undefined" && localStorage.getItem(OWNER_SESSION_KEY) === "true";
