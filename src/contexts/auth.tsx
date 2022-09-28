import { createContext, ReactNode, useEffect, useState } from "react";
import { api } from "../services/api";

type User = {
  id: string;
  name: string;
  login: string;
  avatar_url: string;
};

type AuthContextData = {
  user: User | null;
  signInUrl: string;
  signOut: () => void;
};

export const AuthContext = createContext({} as AuthContextData);

type AuthProvider = {
  children: ReactNode;
};

type AuthResponse = {
  token: string;
  user: {
    id: string;
    avatar_url: string;
    name: string;
    login: string;
  };
};

export function AuthProvider(props: AuthProvider) {
  const [user, setUser] = useState<User | null>(null);

  // redireciona o usuário para autorizar no gh e disponibilizar o code pra nossa aplicação
  const signInUrl = `https://github.com/login/oauth/authorize?scope=user&client_id=124fd0bc6eee0bd5530d`;

  // login
  async function signIn(githubCode: string) {
    const response = await api.post<AuthResponse>("authenticate", {
      code: githubCode,
    });

    const { token, user } = response.data;

    // Adiciona o token no LocalStorage
    localStorage.setItem("@dowhile:token", token);

    // adiciona o token no header da aplicação quando ele faz singIn
    api.defaults.headers.common.authorization = `Bearer ${token}`;

    setUser(user);
  }

  function signOut() {
    setUser(null);
    localStorage.removeItem("@dowhile:token");
  }

  // Buscar dados do usuário caso ele tenha o token no localStorage
  useEffect(() => {
    const token = localStorage.getItem("@dowhile:token");

    if (token) {
      api.defaults.headers.common.authorization = `Bearer ${token}`; // adicionar no axios esse token no header de todas as requisições

      api.get<User>("profile").then((response) => {
        setUser(response.data);
      });
    }
  }, []);

  // Fazer o login quando o usuário tem o código do GH nos query params (o que acontece depois de autorizar o login no gh)
  useEffect(() => {
    const url = window.location.href;
    const hasGithubCode = url.includes("?code=");

    if (hasGithubCode) {
      const [urlWithoutCode, githubCode] = url.split("?code=");

      window.history.pushState({}, "", urlWithoutCode);

      signIn(githubCode);
    }
  }, []);

  return (
    <AuthContext.Provider value={{ signInUrl, user, signOut }}>
      {props.children}
    </AuthContext.Provider>
  );
}
