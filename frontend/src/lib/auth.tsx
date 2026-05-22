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
import { isOwnerLogin, resolveLoginEmail, setOwnerSession } from "@/lib/owner";

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
  return typeof value === "string" && validRoles.includes(value as Role)
    ? (value as Role)
    : null;
};

export const AuthProvider = ({ children }: { children: ReactNode }) => {
  const isDevelopmentMode =
    import.meta.env.VITE_AUTH_DEV_MODE === "true" ||
    !isFirebaseClientConfigured ||
    !firebaseAuth;
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

      const token = await currentUser.getIdTokenResult(true);
      const nextRole = resolveClaimRole(token.claims.role) ?? getRole();
      persistRole(nextRole);
      setRoleState(nextRole);
      setDisplayName(
        currentUser.displayName || currentUser.email || roleNames[nextRole],
      );
      setIsLoading(false);
    });
  }, [isDevelopmentMode]);

  const login = useCallback(
    async ({ email, password, role: selectedRole }: LoginInput) => {
      const ownerLogin = isOwnerLogin(email);
      const loginEmail = resolveLoginEmail(email);
      const nextSelectedRole = ownerLogin ? "admin" : selectedRole;

      if (isDevelopmentMode || !firebaseAuth) {
        persistRole(nextSelectedRole);
        setOwnerSession(ownerLogin);
        setRoleState(nextSelectedRole);
        setDisplayName(ownerLogin ? "cleber.super" : roleNames[nextSelectedRole]);
        setUser(null);
        return roleHome[nextSelectedRole];
      }

      const credential = await signInWithEmailAndPassword(
        firebaseAuth,
        loginEmail,
        password,
      );
      const token = await credential.user.getIdTokenResult(true); // força refresh do token
      const claimRole = resolveClaimRole(token.claims.role);

      if (!claimRole) {
        await signOut(firebaseAuth);
        throw new Error(
          "Usuário sem perfil de acesso. Solicite ao administrador que defina seu nível de acesso.",
        );
      }

      const nextRole = claimRole;

      persistRole(nextRole);
      setOwnerSession(ownerLogin);
      setUser(credential.user);
      setRoleState(nextRole);
      setDisplayName(
        credential.user.displayName ||
          credential.user.email ||
          roleNames[nextRole],
      );

      return roleHome[nextRole];
    },
    [isDevelopmentMode],
  );

  const logout = useCallback(async () => {
    if (!isDevelopmentMode && firebaseAuth) {
      await signOut(firebaseAuth);
    }

    clearRole();
    setOwnerSession(false);
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
