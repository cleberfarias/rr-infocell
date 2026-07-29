import { initializeApp, applicationDefault } from "firebase-admin/app";
import { getAuth } from "firebase-admin/auth";

initializeApp({ credential: applicationDefault(), projectId: "rr-infocell" });

const auth = getAuth();
const email = "cleber.fdelgado@gmail.com";
const password = process.env.RESET_ADMIN_PASSWORD;

if (!password || password.length < 8) {
  throw new Error("Defina RESET_ADMIN_PASSWORD com pelo menos 8 caracteres.");
}

const user = await auth.getUserByEmail(email);
console.log("UID:", user.uid);
console.log(
  "Providers:",
  user.providerData.map((p) => p.providerId),
);

await auth.updateUser(user.uid, { password });
console.log("Senha atualizada com sucesso!");

process.exit(0);
