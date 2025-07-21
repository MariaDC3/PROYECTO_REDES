import http from 'http';
import mysql from 'mysql2';
import { URL } from 'url';

// 1. Configuración mejorada de MySQL con manejo de errores
const conexion = mysql.createConnection({
  host: 'localhost',
  user: 'root',
  password: '',
  database: 'contactos',
  insecureAuth: true, // Necesario para XAMPP
  connectTimeout: 10000 // Tiempo de espera extendido
});

// 2. Conexión con verificación de tabla y simulación de errores
conexion.connect(err => {
  if (err) {
    console.error('🚨 Error crítico de MySQL:', err.message);
    console.log('Recomendaciones:');
    console.log('1. Verifica que MySQL esté corriendo en XAMPP');
    console.log('2. Asegúrate que la base de datos "contactos" exista');
    console.log('3. Prueba con: mysql -u root -e "SHOW DATABASES"');
  } else {
    console.log('✅ Conexión a MySQL exitosa');
    
    // Crear tabla si no existe
    const createTableSQL = `
      CREATE TABLE IF NOT EXISTS mensajes (
        id INT AUTO_INCREMENT PRIMARY KEY,
        nombre VARCHAR(100) NOT NULL,
        email VARCHAR(100) NOT NULL,
        mensaje TEXT NOT NULL,
        fecha TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      )`;
    
    conexion.query(createTableSQL, (err) => {
      if (err) {
        console.error('🚨 Error creando tabla:', err.message);
      } else {
        console.log('✅ Tabla "mensajes" lista');
      }
    });
  }
});

// 3. Servidor con todos los métodos CRUD y pruebas de códigos HTTP
const servidor = http.createServer(async (req, res) => {
  //  CORS completo
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, POST, PUT, PATCH, DELETE, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization');
  
  // Manejo de preflight (CORS)
  if (req.method === 'OPTIONS') {
    res.writeHead(204);
    res.end();
    return;
  }
  
  const url = new URL(req.url, `http://${req.headers.host}`);
  const pathname = url.pathname;
  const id = pathname.split('/')[2];
  
  // Función para leer el cuerpo
  const leerCuerpo = () => new Promise((resolve) => {
    let data = '';
    req.on('data', chunk => data += chunk);
    req.on('end', () => {
      try {
        resolve(JSON.parse(data));
      } catch {
        resolve({});
      }
    });
  });
  
  try {
   // 🔽 POST: Crear nuevo mensaje (con pruebas intencionales)
if (req.method === 'POST' && pathname === '/') {
  const body = await leerCuerpo();

  // Simular diferentes errores usando parámetro especial
  if (url.searchParams.get('test_error')) {
    const errorType = url.searchParams.get('test_error');

    if (errorType === 'validation') {
      console.log('🧪 TEST: Simulando error 400 (validación)');
      res.writeHead(400, { 'Content-Type': 'application/json' });
      return res.end(JSON.stringify({
        error: "Campos faltantes para prueba",
        details: "Se omitieron campos a propósito para probar 400 Bad Request"
      }));
    }

    if (errorType === 'database') {
      console.log('🧪 TEST: Simulando error 500 (BD)');
      res.writeHead(500, { 'Content-Type': 'application/json' });
      return res.end(JSON.stringify({
        error: "Error de base de datos simulado",
        details: "Se forzó este error para probar 500 Internal Server Error"
      }));
    }
  }

  // Validación normal de campos
  if (!body.nombre || !body.email || !body.mensaje) {
    res.writeHead(400, { 'Content-Type': 'application/json' });
    return res.end(JSON.stringify({
      error: "Faltan campos obligatorios",
      required: ["nombre", "email", "mensaje"]
    }));
  }

  const sql = 'INSERT INTO mensajes (nombre, email, mensaje) VALUES (?, ?, ?)';
  conexion.query(sql, [body.nombre, body.email, body.mensaje], (err, result) => {
    if (err) {
      console.error('🚨 Error real en POST:', err.message);
      res.writeHead(500, { 'Content-Type': 'application/json' });
      res.end(JSON.stringify({
        error: "Error en base de datos",
        sql_error: err.message
      }));
    } else {
      console.log(`✅ POST exitoso - ID: ${result.insertId}`);
      
      // ✅ NUEVO: Mostrar en consola los datos que llegaron
      console.log(" DATOS RECIBIDOS DEL FORMULARIO:");
      console.log("Nombre:", body.nombre);
      console.log("Email:", body.email);
      console.log("Mensaje:", body.mensaje);

      res.writeHead(201, { 'Content-Type': 'application/json' });
      res.end(JSON.stringify({
        id: result.insertId,
        message: "Mensaje guardado exitosamente",
        datos_recibidos: {
          nombre: body.nombre,
          email: body.email,
          mensaje: body.mensaje
        }
      }));
    }
  });
}

    
    
    
    // 🔽 PUT: Actualizar mensaje completo
    else if (req.method === 'PUT' && pathname.startsWith('/mensajes/') && id) {
      const body = await leerCuerpo();
      
      if (!body.nombre || !body.email || !body.mensaje) {
        res.writeHead(400, {'Content-Type': 'application/json'});
        return res.end(JSON.stringify({ error: "Todos los campos son requeridos" }));
      }
      
      const sql = 'UPDATE mensajes SET nombre = ?, email = ?, mensaje = ? WHERE id = ?';
      conexion.query(sql, [body.nombre, body.email, body.mensaje, id], (err, result) => {
        if (err) {
          res.writeHead(500, {'Content-Type': 'application/json'});
          res.end(JSON.stringify({ error: "Error en base de datos" }));
        } else if (result.affectedRows === 0) {
          res.writeHead(404, {'Content-Type': 'application/json'});
          res.end(JSON.stringify({ error: "Mensaje no encontrado" }));
        } else {
          res.writeHead(200, {'Content-Type': 'application/json'});
          res.end(JSON.stringify({ message: "Actualización completa exitosa" }));
        }
      });
    }
    
    // 🔽 PATCH: Actualización parcial
    else if (req.method === 'PATCH' && pathname.startsWith('/mensajes/') && id) {
      const body = await leerCuerpo();
      
      if (!body.nombre && !body.email && !body.mensaje) {
        res.writeHead(400, {'Content-Type': 'application/json'});
        return res.end(JSON.stringify({ error: "Al menos un campo debe ser proporcionado" }));
      }
      
      const updates = [];
      const values = [];
      
      if (body.nombre) {
        updates.push('nombre = ?');
        values.push(body.nombre);
      }
      if (body.email) {
        updates.push('email = ?');
        values.push(body.email);
      }
      if (body.mensaje) {
        updates.push('mensaje = ?');
        values.push(body.mensaje);
      }
      
      values.push(id);
      
      const sql = `UPDATE mensajes SET ${updates.join(', ')} WHERE id = ?`;
      
      conexion.query(sql, values, (err, result) => {
        if (err) {
          res.writeHead(500, {'Content-Type': 'application/json'});
          res.end(JSON.stringify({ error: "Error en base de datos" }));
        } else if (result.affectedRows === 0) {
          res.writeHead(404, {'Content-Type': 'application/json'});
          res.end(JSON.stringify({ error: "Mensaje no encontrado" }));
        } else {
          res.writeHead(200, {'Content-Type': 'application/json'});
          res.end(JSON.stringify({ message: "Actualización parcial exitosa" }));
        }
      });
    }
    
    // 🔽 DELETE: Eliminar mensaje
    else if (req.method === 'DELETE' && pathname.startsWith('/mensajes/') && id) {
      const sql = 'DELETE FROM mensajes WHERE id = ?';
      conexion.query(sql, [id], (err, result) => {
        if (err) {
          res.writeHead(500, {'Content-Type': 'application/json'});
          res.end(JSON.stringify({ error: "Error en base de datos" }));
        } else if (result.affectedRows === 0) {
          res.writeHead(404, {'Content-Type': 'application/json'});
          res.end(JSON.stringify({ error: "Mensaje no encontrado" }));
        } else {
          res.writeHead(200, {'Content-Type': 'application/json'});
          res.end(JSON.stringify({ message: "Mensaje eliminado exitosamente" }));
        }
      });
    }
    
    // Ruta no implementada
    else {
      res.writeHead(404, {'Content-Type': 'application/json'});
      res.end(JSON.stringify({ error: "Ruta no implementada" }));
    }
    
  } catch (error) {
    console.error('🔥 Error global:', error);
    res.writeHead(500, {'Content-Type': 'application/json'});
    res.end(JSON.stringify({ error: "Error interno del servidor" }));
  }
});

// 4. Iniciar servidor con información detallada
const PORT = 3000;
servidor.listen(PORT, () => {
  console.log(`\n🚀 Servidor Node.js funcionando en http://localhost:${PORT}`);
  console.log("Endpoints disponibles:");
  console.log(`  POST   /              - Crear mensaje`);
  console.log(`  GET    /mensajes      - Listar todos`);
  console.log(`  GET    /mensajes/:id  - Obtener uno`);
  console.log(`  PUT    /mensajes/:id  - Actualizar completo`);
  console.log(`  PATCH  /mensajes/:id  - Actualizar parcial`);
  console.log(`  DELETE /mensajes/:id  - Eliminar`);
  
  console.log("\n🔍 Pruebas de errores HTTP:");
  console.log(`  POST /?test_error=validation  - Forzar 400 Bad Request`);
  console.log(`  POST /?test_error=database    - Forzar 500 Internal Server Error`);
  console.log(`  GET  /ruta-inexistenta        - Generar 404 Not Found`);
});