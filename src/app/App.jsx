import { useEffect, useMemo, useState } from "react";
import { useAuth } from "../context/AuthContext";
import {
  subscribeLots,
  subscribeRecipes,
  subscribeUsers,
} from "../lib/data";
import { buildHash, calculateDashboardMetrics } from "../lib/utils";
import { Avatar, Badge, Button } from "../components/common";
import { LandingView } from "../features/LandingView";
import { AuthView } from "../features/AuthView";
import { DashboardView } from "../features/DashboardView";
import { ProductionStartView } from "../features/ProductionStartView";
import { ProductionRunView } from "../features/ProductionRunView";
import { HistoryView } from "../features/HistoryView";
import { LotDetailView } from "../features/LotDetailView";
import { AdminRecipesView } from "../features/AdminRecipesView";
import { AdminUsersView } from "../features/AdminUsersView";
import { AdminAuditView } from "../features/AdminAuditView";

function parseRoute() {
  const rawHash = window.location.hash.replace(/^#\/?/, "");
  const parts = rawHash ? rawHash.split("/") : [];

  if (!parts.length || parts[0] === "") return { name: "landing" };
  if (parts[0] === "login") return { name: "login" };
  if (parts[0] === "register") return { name: "register" };
  if (parts[0] === "dashboard") return { name: "dashboard" };
  if (parts[0] === "historial") return { name: "history" };
  if (parts[0] === "produccion" && parts[1] === "nuevo") return { name: "new-lot" };
  if (parts[0] === "ejecucion" && parts[1]) return { name: "execution", lotId: parts[1] };
  if (parts[0] === "lote" && parts[1]) return { name: "lot-detail", lotId: parts[1] };
  if (parts[0] === "admin" && parts[1] === "recetas") return { name: "admin-recipes" };
  if (parts[0] === "admin" && parts[1] === "usuarios") return { name: "admin-users" };
  if (parts[0] === "admin" && parts[1] === "auditoria") return { name: "admin-audit" };
  return { name: "landing" };
}

function isPublicRoute(routeName) {
  return ["landing", "login", "register"].includes(routeName);
}

function Layout({ children, profile, route, onLogout, offline, installPrompt, onInstall }) {
  const isAdmin = profile?.role === "admin";
  const currentHash = window.location.hash || "#/dashboard";
  const navItems = [
    { label: "Inicio", route: "/dashboard" },
    { label: "Nuevo lote", route: "/produccion/nuevo" },
    { label: "Historial", route: "/historial" },
  ];

  if (isAdmin) {
    navItems.push({ label: "Recetas", route: "/admin/recetas" });
    navItems.push({ label: "Auditoría", route: "/admin/auditoria" });
  }

  return (
    <div className="app-shell">
      <header className="topbar">
        <div>
          <span className="eyebrow">Producción guiada</span>
          <h1 className="topbar__title">Gomitas QA</h1>
        </div>
        <div className="topbar__actions">
          {!offline ? <Badge tone="success">Online</Badge> : <Badge tone="warning">Offline</Badge>}
          {installPrompt ? (
            <Button variant="ghost" size="sm" onClick={onInstall}>
              Instalar app
            </Button>
          ) : null}
          {isAdmin ? (
            <Button variant="ghost" size="sm" onClick={() => buildHash("/admin/usuarios")}>
              Usuarios
            </Button>
          ) : null}
          <div className="profile-chip">
            <Avatar name={profile.fullName} />
            <div>
              <strong>{profile.fullName}</strong>
              <span>{profile.role}</span>
            </div>
          </div>
          <Button variant="ghost" size="sm" onClick={onLogout}>
            Salir
          </Button>
        </div>
      </header>

      {offline ? (
        <div className="sync-banner">
          Sin conexión: Firestore mantiene la UI y las cargas de formularios en cola. Las fotos sí
          necesitan internet para subirse.
        </div>
      ) : null}

      <main className="page-shell">{children}</main>

      <nav className="bottom-nav">
        {navItems.map((item) => (
          <button
            key={item.route}
            className={`bottom-nav__item ${currentHash === `#${item.route}` ? "is-active" : ""}`}
            onClick={() => buildHash(item.route)}
          >
            {item.label}
          </button>
        ))}
      </nav>
    </div>
  );
}

export function App() {
  const { user, profile, loading, logout } = useAuth();
  const [route, setRoute] = useState(parseRoute);
  const [recipes, setRecipes] = useState([]);
  const [lots, setLots] = useState([]);
  const [users, setUsers] = useState([]);
  const [offline, setOffline] = useState(!navigator.onLine);
  const [installPrompt, setInstallPrompt] = useState(null);

  useEffect(() => {
    const onHashChange = () => setRoute(parseRoute());
    const onOnline = () => setOffline(false);
    const onOffline = () => setOffline(true);
    const onBeforeInstallPrompt = (event) => {
      event.preventDefault();
      setInstallPrompt(event);
    };

    window.addEventListener("hashchange", onHashChange);
    window.addEventListener("online", onOnline);
    window.addEventListener("offline", onOffline);
    window.addEventListener("beforeinstallprompt", onBeforeInstallPrompt);

    return () => {
      window.removeEventListener("hashchange", onHashChange);
      window.removeEventListener("online", onOnline);
      window.removeEventListener("offline", onOffline);
      window.removeEventListener("beforeinstallprompt", onBeforeInstallPrompt);
    };
  }, []);

  useEffect(() => {
    if (!user || !profile) return undefined;

    const unsubscribeRecipes = subscribeRecipes(setRecipes);
    const unsubscribeLots = subscribeLots(profile, setLots);
    const unsubscribeUsers = profile.role === "admin" ? subscribeUsers(setUsers) : () => {};

    return () => {
      unsubscribeRecipes();
      unsubscribeLots();
      unsubscribeUsers();
    };
  }, [profile, user]);

  useEffect(() => {
    if (loading) return;

    if (!user && !isPublicRoute(route.name)) {
      buildHash("/login");
      return;
    }

    if (profile?.role !== "admin" && route.name.startsWith?.("admin")) {
      buildHash("/dashboard");
    }
  }, [loading, profile, route.name, user]);

  const metrics = useMemo(() => calculateDashboardMetrics(lots), [lots]);
  const activeLots = lots.filter((lot) => ["in_progress", "ready_for_closure"].includes(lot.status));

  async function handleInstall() {
    if (!installPrompt) return;
    await installPrompt.prompt();
    setInstallPrompt(null);
  }

  if (loading) {
    return <div className="splash">Cargando producción asistida...</div>;
  }

  if (!user || !profile) {
    if (route.name === "login" || route.name === "register") {
      return <AuthView mode={route.name} />;
    }

    return <LandingView />;
  }

  let content = (
    <DashboardView
      profile={profile}
      lots={lots}
      metrics={metrics}
      activeLots={activeLots}
      onNavigate={buildHash}
    />
  );

  if (route.name === "new-lot") {
    content = (
      <ProductionStartView
        profile={profile}
        recipes={recipes}
        users={users}
        onCreated={(lotId) => buildHash(`/ejecucion/${lotId}`)}
      />
    );
  } else if (route.name === "execution") {
    content = <ProductionRunView lotId={route.lotId} profile={profile} />;
  } else if (route.name === "history") {
    content = <HistoryView lots={lots} recipes={recipes} users={users} profile={profile} />;
  } else if (route.name === "lot-detail") {
    content = <LotDetailView lotId={route.lotId} profile={profile} />;
  } else if (route.name === "admin-recipes") {
    content = <AdminRecipesView recipes={recipes} profile={profile} />;
  } else if (route.name === "admin-users") {
    content = <AdminUsersView users={users} profile={profile} />;
  } else if (route.name === "admin-audit") {
    content = <AdminAuditView lots={lots} recipes={recipes} users={users} />;
  }

  return (
    <Layout
      profile={profile}
      route={route}
      onLogout={logout}
      offline={offline}
      installPrompt={installPrompt}
      onInstall={handleInstall}
    >
      {content}
    </Layout>
  );
}
