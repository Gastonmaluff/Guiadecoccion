import { Button, Card, EmptyState } from "../components/common";
import { buildHash } from "../lib/utils";

export function LandingView() {
  return (
    <div className="landing">
      <div className="hero-panel">
        <div>
          <span className="eyebrow">PWA industrial mobile-first</span>
          <h1>Producción guiada, trazabilidad por pasos y evidencia fotográfica por lote.</h1>
          <p>
            Diseñada para operarios en iPhone y para supervisión completa en desktop. Cada lote
            avanza solo si cumple el checklist, la evidencia y el control de calidad definido por
            receta.
          </p>
        </div>
        <div className="hero-actions">
          <Button size="lg" onClick={() => buildHash("/login")}>
            Arrancar producción
          </Button>
          <Button variant="secondary" size="lg" onClick={() => buildHash("/login")}>
            Iniciar sesión
          </Button>
          <Button variant="ghost" size="lg" onClick={() => buildHash("/register")}>
            Registrarse
          </Button>
          <Button variant="ghost" size="lg" onClick={() => buildHash("/login")}>
            Historial
          </Button>
        </div>
      </div>

      <div className="landing-grid">
        <Card>
          <h3>1. Configuración de recetas</h3>
          <p>
            El admin define pasos críticos, evidencia obligatoria, referencias, tolerancias y
            tiempos esperados.
          </p>
        </Card>
        <Card>
          <h3>2. Ejecución asistida</h3>
          <p>
            El operario sigue cada paso de forma secuencial y no puede avanzar si falta foto o dato
            requerido.
          </p>
        </Card>
        <Card>
          <h3>3. Auditoría completa</h3>
          <p>
            Lotes, checklist, fotos, tiempos, desvíos y observaciones quedan listos para revisión
            admin.
          </p>
        </Card>
      </div>

      <EmptyState
        title="Listo para producción real"
        description="La app queda preparada para Firebase Auth, Firestore, Storage, PWA instalable y despliegue en GitHub Pages."
      />
    </div>
  );
}
