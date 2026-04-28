import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
  type ReactNode,
} from "react";
import {
  onAuthStateChanged,
  signInWithEmailAndPassword,
  signOut,
  type User,
} from "firebase/auth";
import { firebaseAuth, isFirebaseClientConfigured } from "@/lib/firebase";
import {
  clearRole,
  getRole,
  roleHome,
  roleNames,
  setRole as persistRole,
  type Role,
} from "@/lib/roles";

type LoginInput = {
  email: string;
  password: string;
  role: Role;
};

type AuthContextValue = {
  displayName: string;
  isAuthenticated: boolean;
  isDevelopmentMode: boolean;
  isLoading: boolean;
  login: (input: LoginInput) => Promise<string>;
  logout: () => Promise<void>;
  role: Role;
  user: User | null;
};

const AuthContext = createContext<AuthContextValue | null>(null);

const validRoles: Role[] = ["admin", "atendente", "tecnico"];

const resolveClaimRole = (value: unknown): Role | null => {
  return typeof value === "string" && validRoles.includes(value as Role) ? (value as Role) : null;
};

export const AuthProvider = ({ children }: { children: ReactNode }) => {
  const isDevelopmentMode = import.meta.env.VITE_AUTH_DEV_MODE === "true" || !isFirebaseClientConfigured || !firebaseAuth;
  const [user, setUser] = useState<User | null>(null);
  const [role, setRoleState] = useState<Role>(() => getRole());
  const [displayName, setDisplayName] = useState(() => roleNames[getRole()]);
  const [isLoading, setIsLoading] = useState(!isDevelopmentMode);

  useEffect(() => {
    if (isDevelopmentMode || !firebaseAuth) {
      setIsLoading(false);
      return;
    }

    return onAuthStateChanged(firebaseAuth, async (currentUser) => {
      setUser(currentUser);

      if (!currentUser) {
        clearRole();
        setRoleState("admin");
        setDisplayName(roleNames.admin);
        setIsLoading(false);
        return;
      }

      const token = await currentUser.getIdTokenResult();
      const nextRole = resolveClaimRole(token.claims.role) ?? getRole();
      persistRole(nextRole);
      setRoleState(nextRole);
      setDisplayName(currentUser.displayName || currentUser.email || roleNames[nextRole]);
      setIsLoading(false);
    });
  }, [isDevelopmentMode]);

  const login = useCallback(
    async ({ email, password, role: selectedRole }: LoginInput) => {
      if (isDevelopmentMode || !firebaseAuth) {
        persistRole(selectedRole);
        setRoleState(selectedRole);
        setDisplayName(roleNames[selectedRole]);
        setUser(null);
        return roleHome[selectedRole];
      }

      const credential = await signInWithEmailAndPassword(firebaseAuth, email, password);
      const token = await credential.user.getIdTokenResult();
      const nextRole = resolveClaimRole(token.claims.role) ?? selectedRole;

      persistRole(nextRole);
      setUser(credential.user);
      setRoleState(nextRole);
      setDisplayName(credential.user.displayName || credential.user.email || roleNames[nextRole]);

      return roleHome[nextRole];
    },
    [isDevelopmentMode],
  );

  const logout = useCallback(async () => {
    if (!isDevelopmentMode && firebaseAuth) {
      await signOut(firebaseAuth);
    }

    clearRole();
    setUser(null);
    setRoleState("admin");
    setDisplayName(roleNames.admin);
  }, [isDevelopmentMode]);

  const value = useMemo<AuthContextValue>(
    () => ({
      displayName,
      isAuthenticated: isDevelopmentMode || Boolean(user),
      isDevelopmentMode,
      isLoading,
      login,
      logout,
      role,
      user,
    }),
    [displayName, isDevelopmentMode, isLoading, login, logout, role, user],
  );

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
};

export const useAuth = () => {
  const context = useContext(AuthContext);

  if (!context) {
    throw new Error("useAuth deve ser usado dentro de AuthProvider");
  }

  return context;
};
