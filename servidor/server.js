import 'dotenv/config';
import express from 'express';
import cors from 'cors';
import pg from 'pg';
import argon2 from 'argon2';
import bcrypt from 'bcryptjs';
import jwt from 'jsonwebtoken';

const pool = new pg.Pool({ connectionString: process.env.DATABASE_URL });
const app = express();
app.use(cors({ origin: process.env.FRONT_ORIGIN }));
app.use(express.json());

const ROLES = { 1: 'Paciente', 2: 'Fisioterapeuta', 3: 'Recepción', 4: 'Administrador' };
const DOMINIOS = ['gmail.com','outlook.com','outlook.es','hotmail.com','hotmail.es','live.com','yahoo.com','yahoo.es','icloud.com','me.com','protonmail.com'];
const correoOk = (c) => /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(c) && DOMINIOS.includes(c.split('@')[1]);

// Mínimo 12 caracteres, con mayúscula, minúscula, número y símbolo.
const claveFuerte = (c) => c.length >= 12 && /[A-Z]/.test(c) && /[a-z]/.test(c) && /\d/.test(c) && /[^A-Za-z0-9\s]/.test(c);

// Misma regla que la función fisionova.cedula_valida de la base de datos.
function cedulaOk(c) {
  if (!/^\d{10}$/.test(c)) return false;
  const prov = +c.slice(0, 2);
  if (prov < 1 || prov > 24 || +c[2] > 5) return false;
  let s = 0;
  [2,1,2,1,2,1,2,1,2].forEach((k, i) => { let v = +c[i] * k; if (v > 9) v -= 9; s += v; });
  return (10 - (s % 10)) % 10 === +c[9];
}

const TEXTO_CONSENTIMIENTO =
  'Autorizo el tratamiento de mis datos personales por parte de FisioNova conforme a la LOPDP.';

const firmar = (u) => jwt.sign({ id: Number(u.id), rol: ROLES[u.rol_id] }, process.env.JWT_SECRET, { expiresIn: '8h' });

// Forma que espera Angular. En esta base el id del paciente/fisioterapeuta es su usuario_id.
const publico = (u) => ({
  id: String(u.id),
  nombre: `${u.nombres} ${u.apellidos}`,
  rol: ROLES[u.rol_id],
  correo: u.correo,
  ...(u.rol_id === 1 ? { pacienteId: String(u.id) } : {}),
  ...(u.rol_id === 2 ? { fisioId: String(u.id) } : {}),
});

// Acepta contraseñas argon2id y bcrypt (las dos que permite la base).
const claveCorrecta = (clave, hash) =>
  hash.startsWith('$argon2') ? argon2.verify(hash, clave) : bcrypt.compare(clave, hash);

// ---- middlewares ----
const auth = (req, res, next) => {
  const t = (req.headers.authorization || '').replace('Bearer ', '');
  try { req.user = jwt.verify(t, process.env.JWT_SECRET); next(); }
  catch { res.status(401).json({ error: 'Sesión no válida.' }); }
};
const soloRoles = (...roles) => (req, res, next) =>
  roles.includes(req.user.rol) ? next() : res.status(403).json({ error: 'No tienes permiso.' });

// ---- registro público de pacientes ----
app.post('/api/registro', async (req, res) => {
  const { nombre, cedula, correo, telefono, clave, consentimiento } = req.body;
  const partes = String(nombre || '').trim().split(/\s+/).filter(Boolean);
  if (partes.length < 2) return res.status(400).json({ error: 'Escribe tus nombres y apellidos.' });
  if (!cedulaOk(cedula)) return res.status(400).json({ error: 'La cédula no es válida.' });
  const email = String(correo || '').trim().toLowerCase();
  if (!correoOk(email)) return res.status(400).json({ error: 'Usa un correo de Gmail, Outlook, Hotmail, Yahoo o iCloud.' });
  if (!/^\d{9,10}$/.test(telefono || '')) return res.status(400).json({ error: 'El teléfono debe tener 9 o 10 dígitos.' });
  if (!clave || clave.length > 128 || !claveFuerte(clave)) return res.status(400).json({ error: 'La contraseña debe tener mínimo 12 caracteres, con mayúscula, minúscula, número y símbolo.' });
  const local = email.split('@')[0];
  if (clave.includes(cedula) || (local.length >= 4 && clave.toLowerCase().includes(local))) return res.status(400).json({ error: 'No uses tu cédula ni tu correo dentro de la contraseña.' });
  if (!consentimiento) return res.status(400).json({ error: 'Debes aceptar el tratamiento de datos.' });

  // Se separa el nombre completo: mitad nombres, mitad apellidos.
  const corte = Math.floor(partes.length / 2);
  const nombres = partes.slice(0, corte).join(' ');
  const apellidos = partes.slice(corte).join(' ');
  const hash = await argon2.hash(clave, { type: argon2.argon2id });

  const db = await pool.connect();
  try {
    await db.query('BEGIN');
    const u = await db.query(
      `INSERT INTO fisionova.usuario (rol_id, cedula, nombres, apellidos, correo, telefono, password_hash)
       VALUES (1, $1, $2, $3, $4, $5, $6) RETURNING *`,
      [cedula, nombres, apellidos, email, telefono, hash]);
    const id = u.rows[0].id;
    await db.query(`INSERT INTO fisionova.paciente (usuario_id) VALUES ($1)`, [id]);

    let v = await db.query(`SELECT id FROM fisionova.consentimiento_version ORDER BY publicado_en DESC LIMIT 1`);
    if (!v.rows[0]) {
      v = await db.query(
        `INSERT INTO fisionova.consentimiento_version (version, texto) VALUES ('v1.0', $1) RETURNING id`,
        [TEXTO_CONSENTIMIENTO]);
    }
    await db.query(
      `INSERT INTO fisionova.consentimiento (paciente_id, version_id) VALUES ($1, $2)`,
      [id, v.rows[0].id]);

    await db.query('COMMIT');
    res.status(201).json({ token: firmar(u.rows[0]), usuario: publico(u.rows[0]) });
  } catch (e) {
    await db.query('ROLLBACK');
    if (e.code === '23505') return res.status(409).json({ error: 'Ya existe una cuenta con esa cédula o correo.' });
    if (e.code === '23514') return res.status(400).json({ error: 'Revisa tus datos: alguno no cumple las reglas del sistema.' });
    console.error(e);
    res.status(500).json({ error: 'No pudimos crear tu cuenta.' });
  } finally { db.release(); }
});

// ---- login (cédula o correo) con bloqueo tras 5 intentos (RF-03) ----
const MSG = 'No pudimos iniciar sesión. Revisa tus datos o espera 15 minutos si superaste los intentos permitidos.';
app.post('/api/login', async (req, res) => {
  const id = String(req.body.identificador || '').trim().toLowerCase();
  const { rows } = await pool.query(
    `SELECT * FROM fisionova.usuario WHERE correo = $1 OR cedula = $1`, [id]);
  const u = rows[0];
  if (!u || !u.activo) return res.status(401).json({ error: MSG });
  if (u.bloqueado_hasta && new Date(u.bloqueado_hasta) > new Date()) return res.status(401).json({ error: MSG });

  const ok = await claveCorrecta(String(req.body.clave || ''), u.password_hash);
  if (!ok) {
    const n = u.intentos_fallidos + 1;
    if (n >= 5) {
      await pool.query(
        `UPDATE fisionova.usuario SET intentos_fallidos = 0, bloqueado_hasta = now() + interval '15 minutes' WHERE id = $1`, [u.id]);
    } else {
      await pool.query(`UPDATE fisionova.usuario SET intentos_fallidos = $2 WHERE id = $1`, [u.id, n]);
    }
    return res.status(401).json({ error: MSG });
  }
  await pool.query(`UPDATE fisionova.usuario SET intentos_fallidos = 0, bloqueado_hasta = NULL WHERE id = $1`, [u.id]);
  res.json({ token: firmar(u), usuario: publico(u) });
});

// ---- ejemplo de ruta protegida por rol ----
app.get('/api/pacientes', auth, soloRoles('Administrador', 'Recepción', 'Fisioterapeuta'), async (_req, res) => {
  const { rows } = await pool.query(
    `SELECT u.id, u.cedula, u.nombres || ' ' || u.apellidos AS nombre, u.correo, u.telefono
     FROM fisionova.paciente p JOIN fisionova.usuario u ON u.id = p.usuario_id
     ORDER BY u.apellidos, u.nombres`);
  res.json(rows);
});

app.listen(process.env.PORT, () => console.log(`API lista en http://localhost:${process.env.PORT}`));
