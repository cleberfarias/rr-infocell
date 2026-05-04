import { auth } from "../firebase/admin.js";

const validRoles = ["admin", "atendente", "tecnico"] as const;
type Role = (typeof validRoles)[number];

type ParsedArgs = {
  displayName?: string;
  email?: string;
  password?: string;
  role?: Role;
  uid?: string;
};

const parseArgs = (args: string[]): ParsedArgs => {
  const parsed: ParsedArgs = {};

  for (let index = 0; index < args.length; index += 1) {
    const arg = args[index];
    const next = args[index + 1];

    if (!arg.startsWith("--")) {
      continue;
    }

    if (!next || next.startsWith("--")) {
      throw new Error(`Informe um valor para ${arg}.`);
    }

    index += 1;

    switch (arg) {
      case "--display-name":
        parsed.displayName = next;
        break;
      case "--email":
        parsed.email = next;
        break;
      case "--password":
        parsed.password = next;
        break;
      case "--role":
        if (!validRoles.includes(next as Role)) {
          throw new Error(`Role invalida. Use: ${validRoles.join(", ")}.`);
        }

        parsed.role = next as Role;
        break;
      case "--uid":
        parsed.uid = next;
        break;
      default:
        throw new Error(`Argumento desconhecido: ${arg}.`);
    }
  }

  return parsed;
};

const printUsage = () => {
  console.log(
    [
      "Uso:",
      "  npm run auth:set-role -- --email usuario@exemplo.com --role admin",
      "  npm run auth:set-role -- --uid firebase-uid --role tecnico",
      "  npm run auth:set-role -- --email usuario@exemplo.com --password senhaInicial --display-name \"Nome\" --role atendente",
      "",
      "Roles validas: admin, atendente, tecnico",
    ].join("\n"),
  );
};

const getOrCreateUser = async (args: ParsedArgs) => {
  if (!auth) {
    throw new Error(
      "Firebase Admin SDK nao esta configurado. Defina GOOGLE_APPLICATION_CREDENTIALS ou FIREBASE_CLIENT_EMAIL/FIREBASE_PRIVATE_KEY.",
    );
  }

  if (args.uid) {
    return auth.getUser(args.uid);
  }

  if (!args.email) {
    throw new Error("Informe --email ou --uid.");
  }

  try {
    return await auth.getUserByEmail(args.email);
  } catch {
    if (!args.password) {
      throw new Error(
        `Usuario ${args.email} nao existe. Informe --password para cria-lo ou crie no Firebase Console.`,
      );
    }

    return auth.createUser({
      displayName: args.displayName,
      email: args.email,
      password: args.password,
    });
  }
};

const main = async () => {
  const args = parseArgs(process.argv.slice(2));

  if (!args.role) {
    throw new Error("Informe --role.");
  }

  const user = await getOrCreateUser(args);
  const existingClaims = user.customClaims ?? {};
  const nextClaims = {
    ...existingClaims,
    role: args.role,
  };

  await auth?.setCustomUserClaims(user.uid, nextClaims);

  console.log(
    [
      "Custom claim atualizada.",
      `UID: ${user.uid}`,
      `Email: ${user.email ?? "-"}`,
      `Role: ${args.role}`,
      "O usuario precisa sair e entrar novamente para receber o novo token.",
    ].join("\n"),
  );
};

main().catch((error: unknown) => {
  console.error(error instanceof Error ? error.message : error);
  printUsage();
  process.exitCode = 1;
});
