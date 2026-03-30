import { FormEvent, useState } from "react";
import { loginUser, registerUser } from "@/lib/boardApi";

const AUTH_KEY = "pm.authenticated";
const AUTH_USER_KEY = "pm.username";

const readAuthFlag = () => {
  try {
    return window.sessionStorage.getItem(AUTH_KEY) === "true";
  } catch {
    return false;
  }
};

const readStoredUsername = () => {
  try {
    return window.sessionStorage.getItem(AUTH_USER_KEY) || "";
  } catch {
    return "";
  }
};

const writeAuth = (isAuthenticated: boolean, username?: string) => {
  try {
    if (isAuthenticated && username) {
      window.sessionStorage.setItem(AUTH_KEY, "true");
      window.sessionStorage.setItem(AUTH_USER_KEY, username);
      return;
    }
    window.sessionStorage.removeItem(AUTH_KEY);
    window.sessionStorage.removeItem(AUTH_USER_KEY);
  } catch {
    // Ignore storage failures and keep auth state in memory for this session.
  }
};

export type AuthMode = "login" | "register";

export const useAuth = () => {
  const [isAuthenticated, setIsAuthenticated] = useState(readAuthFlag);
  const [authenticatedUsername, setAuthenticatedUsername] = useState(readStoredUsername);
  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [error, setError] = useState("");
  const [mode, setMode] = useState<AuthMode>("login");
  const [isLoading, setIsLoading] = useState(false);
  const [successMessage, setSuccessMessage] = useState("");

  const switchMode = (nextMode: AuthMode) => {
    setMode(nextMode);
    setError("");
    setSuccessMessage("");
    setUsername("");
    setPassword("");
    setConfirmPassword("");
  };

  const handleLogin = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setError("");
    setIsLoading(true);

    try {
      await loginUser({ username, password });
      writeAuth(true, username);
      setAuthenticatedUsername(username);
      setIsAuthenticated(true);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Login failed.");
    } finally {
      setIsLoading(false);
    }
  };

  const handleRegister = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setError("");

    if (password.length < 6) {
      setError("Password must be at least 6 characters.");
      return;
    }

    if (password !== confirmPassword) {
      setError("Passwords do not match.");
      return;
    }

    setIsLoading(true);

    try {
      const result = await registerUser({ username, password });
      setSuccessMessage(result.message);
      setMode("login");
      setPassword("");
      setConfirmPassword("");
    } catch (err) {
      setError(err instanceof Error ? err.message : "Registration failed.");
    } finally {
      setIsLoading(false);
    }
  };

  const handleLogout = () => {
    writeAuth(false);
    setIsAuthenticated(false);
    setAuthenticatedUsername("");
    setUsername("");
    setPassword("");
    setConfirmPassword("");
    setError("");
    setSuccessMessage("");
    setMode("login");
  };

  return {
    isAuthenticated,
    username,
    setUsername,
    password,
    setPassword,
    confirmPassword,
    setConfirmPassword,
    error,
    handleLogin,
    handleRegister,
    handleLogout,
    validUsername: authenticatedUsername,
    mode,
    switchMode,
    isLoading,
    successMessage,
  };
};
