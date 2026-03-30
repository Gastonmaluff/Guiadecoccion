import { useState } from "react";
import { FirebaseError } from "firebase/app";
import { Button, Card, Field, Input } from "../components/common";
import { useAuth } from "../context/AuthContext";
import { buildHash } from "../lib/utils";

const initialState = {
  fullName: "",
  email: "",
  password: "",
};

export function AuthView({ mode = "login" }) {
  const isRegister = mode === "register";
  const { login, register } = useAuth();
  const [form, setForm] = useState(initialState);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");

  async function handleSubmit(event) {
    event.preventDefault();
    setBusy(true);
    setError("");

    try {
      if (isRegister) {
        await register(form.fullName.trim(), form.email.trim(), form.password);
        buildHash("/dashboard");
      } else {
        await login(form.email.trim(), form.password);
        buildHash("/dashboard");
      }
    } catch (submissionError) {
      if (submissionError instanceof FirebaseError) {
        setError(submissionError.message);
      } else {
        setError("No se pudo completar la autenticación.");
      }
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="auth-page">
      <Card className="auth-card">
        <span className="eyebrow">{isRegister ? "Registro operario" : "Acceso seguro"}</span>
        <h2>{isRegister ? "Crear cuenta" : "Iniciar sesión"}</h2>
        <p>
          {isRegister
            ? "Los nuevos usuarios se crean como operario. El admin puede activar, desactivar o cambiar rol desde su panel."
            : "Entrá para arrancar lotes, continuar producción o auditar trazabilidad."}
        </p>

        <form className="stack-lg" onSubmit={handleSubmit}>
          {isRegister ? (
            <Field label="Nombre completo">
              <Input
                value={form.fullName}
                onChange={(event) => setForm((current) => ({ ...current, fullName: event.target.value }))}
                required
                placeholder="Ej. María Gómez"
              />
            </Field>
          ) : null}

          <Field label="Email">
            <Input
              value={form.email}
              onChange={(event) => setForm((current) => ({ ...current, email: event.target.value }))}
              required
              type="email"
              placeholder="operario@empresa.com"
            />
          </Field>

          <Field label="Contraseña">
            <Input
              value={form.password}
              onChange={(event) => setForm((current) => ({ ...current, password: event.target.value }))}
              required
              type="password"
              placeholder="••••••••"
              minLength={8}
            />
          </Field>

          {error ? <div className="error-banner">{error}</div> : null}

          <Button block size="lg" disabled={busy}>
            {busy ? "Procesando..." : isRegister ? "Registrarme" : "Entrar"}
          </Button>
        </form>

        <div className="auth-actions">
          <button onClick={() => buildHash(isRegister ? "/login" : "/register")}>
            {isRegister ? "Ya tengo cuenta" : "Crear cuenta"}
          </button>
          <button onClick={() => buildHash("/")}>Volver al inicio</button>
        </div>
      </Card>
    </div>
  );
}
