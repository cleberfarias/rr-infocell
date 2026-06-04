import type { UserRecord } from "firebase-admin/auth";
import { Timestamp } from "firebase-admin/firestore";

import { auth, db } from "../../firebase/admin.js";
import { AppError } from "../../shared/errors.js";
import { httpStatus } from "../../shared/http-status.js";
import { DEFAULT_TENANT_ID } from "../tenants/tenant.config.js";
import type { Usuario, UsuarioInput, UsuarioRole, UsuarioUpdateInput } from "./usuarios.types.js";

const mapUser = (user: UserRecord): Usuario => ({
  uid: user.uid,
  email: user.email,
  displayName: user.displayName,
  disabled: user.disabled,
  role: user.customClaims?.role as UsuarioRole | undefined,
  createdAt: user.metadata.creationTime,
  lastSignInAt: user.metadata.lastSignInTime,
});

export class UsuariosService {
  private getAuth() {
    if (!auth) {
      throw new AppError(
        "firebase_auth_not_configured",
        "Firebase Auth Admin SDK nao esta configurado.",
        httpStatus.internalServerError,
      );
    }

    return auth;
  }

  async list(tenantId = DEFAULT_TENANT_ID) {
    if (!db) {
      // fallback para ambiente sem Firestore (testes/dev)
      const client = this.getAuth();
      const result = await client.listUsers(100);
      return result.users.map(mapUser);
    }

    const snapshot = await db
      .collection("usuarios")
      .where("tenantId", "==", tenantId)
      .where("status", "==", "ativo")
      .get();

    if (snapshot.empty) return [];

    const client = this.getAuth();
    const users = await Promise.all(
      snapshot.docs.map((doc) => client.getUser(doc.id).catch(() => null)),
    );

    return users.filter((u): u is UserRecord => u !== null).map(mapUser);
  }

  async listByRole(role: UsuarioRole, tenantId = DEFAULT_TENANT_ID) {
    const usuarios = await this.list(tenantId);

    return usuarios.filter((usuario) => usuario.role === role && !usuario.disabled);
  }

  async create(input: UsuarioInput, tenantId = DEFAULT_TENANT_ID) {
    const client = this.getAuth();
    const user = await client.createUser({
      disabled: input.disabled ?? false,
      displayName: input.displayName,
      email: input.email,
      password: input.password,
    });

    await client.setCustomUserClaims(user.uid, {
      ...(user.customClaims ?? {}),
      role: input.role,
    });

    if (db) {
      const agora = Timestamp.now();
      await db.collection("usuarios").doc(user.uid).set({
        uid: user.uid,
        email: input.email,
        nome: input.displayName ?? "",
        tenantId,
        role: input.role,
        status: "ativo",
        createdAt: agora,
        updatedAt: agora,
      });
    }

    return mapUser(await client.getUser(user.uid));
  }

  async delete(uid: string) {
    const client = this.getAuth();
    await client.deleteUser(uid);

    if (db) {
      await db.collection("usuarios").doc(uid).delete();
    }
  }

  async update(uid: string, input: UsuarioUpdateInput) {
    const client = this.getAuth();
    const current = await client.getUser(uid);
    const user = await client.updateUser(uid, {
      disabled: input.disabled,
      displayName: input.displayName,
      password: input.password,
    });

    await client.setCustomUserClaims(uid, {
      ...(current.customClaims ?? {}),
      role: input.role,
    });

    if (db) {
      await db
        .collection("usuarios")
        .doc(uid)
        .set({ role: input.role, updatedAt: Timestamp.now() }, { merge: true });
    }

    return mapUser(await client.getUser(user.uid));
  }
}

export const usuariosService = new UsuariosService();
