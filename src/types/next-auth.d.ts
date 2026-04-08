import "next-auth";

declare module "next-auth" {
  interface Session {
    user: {
      id: string;
      name?: string | null;
      email?: string | null;
      image?: string | null;
      firstName?: string;
      lastName?: string;
      team?: string;
      role?: string;
    };
  }

  interface User {
    id: string;
    name?: string | null;
    email?: string | null;
    firstName?: string;
    lastName?: string;
    team?: string;
    role?: string;
  }
}

declare module "next-auth/jwt" {
  interface JWT {
    id: string;
    firstName?: string;
    lastName?: string;
    team?: string;
    role?: string;
  }
}
