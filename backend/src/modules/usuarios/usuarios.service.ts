import type { UserRecord } from "firebase-admin/auth";

import { auth } from "../../firebase/admin.js";
import { AppError } from "../../shared/errors.js";
import { httpStatus } from "../../shared/http-status.js";
import type {
  Usuario,
  UsuarioInput,
  UsuarioRole,
  UsuarioUpdateInput,
} from "./usuarios.types.js";

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

  async list() {
    const client = this.getAuth();
    const result = await client.listUsers(100);

    return result.users.map(mapUser);
  }

  async create(input: UsuarioInput) {
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

    return mapUser(await client.getUser(user.uid));
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

    return mapUser(await client.getUser(user.uid));
  }
}

export const usuariosService = new UsuariosService();
