import { useState } from "react";
import { Badge, Button, Card, EmptyState, Select, StatusBadge } from "../components/common";
import { formatDateTime } from "../lib/utils";
import { updateUserRecord } from "../lib/data";

export function AdminUsersView({ users, profile }) {
  const [busyId, setBusyId] = useState("");
  const [error, setError] = useState("");

  async function patchUser(userId, patch) {
    setBusyId(userId);
    setError("");

    try {
      await updateUserRecord(userId, patch, profile);
    } catch {
      setError("No se pudo actualizar el usuario.");
    } finally {
      setBusyId("");
    }
  }

  return (
    <div className="stack-xl">
      <Card>
        <div className="section-head">
          <div>
            <span className="eyebrow">Panel admin</span>
            <h2>Gestión de usuarios</h2>
          </div>
          <Badge tone="info">{users.length} usuarios</Badge>
        </div>

        {error ? <div className="error-banner">{error}</div> : null}

        {users.length ? (
          <div className="list-stack">
            {users.map((user) => (
              <div key={user.id} className="list-item list-item--static">
                <div>
                  <strong>{user.fullName}</strong>
                  <p>{user.email}</p>
                  <small>Creado: {formatDateTime(user.createdAt)}</small>
                </div>

                <div className="user-admin-controls">
                  <StatusBadge status={user.active ? "approved" : "rejected"} />
                  <Select
                    value={user.role}
                    onChange={(event) => patchUser(user.id, { role: event.target.value })}
                    disabled={busyId === user.id}
                  >
                    <option value="admin">admin</option>
                    <option value="operario">operario</option>
                  </Select>
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => patchUser(user.id, { active: !user.active })}
                    disabled={busyId === user.id}
                  >
                    {user.active ? "Desactivar" : "Activar"}
                  </Button>
                </div>
              </div>
            ))}
          </div>
        ) : (
          <EmptyState
            title="Sin usuarios"
            description="Los usuarios nuevos pueden registrarse desde la app; acá se administran sus roles y estado."
          />
        )}
      </Card>
    </div>
  );
}
