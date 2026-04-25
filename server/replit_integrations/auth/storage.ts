import { query } from "../../db";

export interface ReplitAuthUser {
  id: string;
  email: string | null;
  firstName: string | null;
  lastName: string | null;
  profileImageUrl: string | null;
  createdAt: Date | null;
  updatedAt: Date | null;
}

export interface UpsertUser {
  id: string;
  email?: string | null;
  firstName?: string | null;
  lastName?: string | null;
  profileImageUrl?: string | null;
}

export interface IAuthStorage {
  getUser(id: string): Promise<ReplitAuthUser | undefined>;
  upsertUser(user: UpsertUser): Promise<ReplitAuthUser>;
}

interface UserRow {
  id: string;
  email: string | null;
  first_name: string | null;
  last_name: string | null;
  profile_image_url: string | null;
  created_at: Date | null;
  updated_at: Date | null;
}

function rowToUser(row: UserRow): ReplitAuthUser {
  return {
    id: row.id,
    email: row.email,
    firstName: row.first_name,
    lastName: row.last_name,
    profileImageUrl: row.profile_image_url,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
  };
}

class AuthStorage implements IAuthStorage {
  async getUser(id: string): Promise<ReplitAuthUser | undefined> {
    const result = await query<UserRow>(
      `SELECT id, email, first_name, last_name, profile_image_url, created_at, updated_at
         FROM users WHERE id = $1`,
      [id],
    );
    const row = result.rows[0];
    return row ? rowToUser(row) : undefined;
  }

  async upsertUser(userData: UpsertUser): Promise<ReplitAuthUser> {
    const result = await query<UserRow>(
      `INSERT INTO users (id, email, first_name, last_name, profile_image_url, created_at, updated_at)
       VALUES ($1, $2, $3, $4, $5, NOW(), NOW())
       ON CONFLICT (id) DO UPDATE SET
         email = EXCLUDED.email,
         first_name = EXCLUDED.first_name,
         last_name = EXCLUDED.last_name,
         profile_image_url = EXCLUDED.profile_image_url,
         updated_at = NOW()
       RETURNING id, email, first_name, last_name, profile_image_url, created_at, updated_at`,
      [
        userData.id,
        userData.email ?? null,
        userData.firstName ?? null,
        userData.lastName ?? null,
        userData.profileImageUrl ?? null,
      ],
    );
    return rowToUser(result.rows[0]);
  }
}

export const authStorage = new AuthStorage();
