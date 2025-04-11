import knex from "knex";

const db = knex({
  client: "sqlite3",
  connection: {
    filename: "./reservas.db",
  },
  useNullAsDefault: true,
});

// Crear la tabla de reservas si no existe
db.schema.hasTable("reservas").then((exists) => {
  if (!exists) {
    return db.schema.createTable("reservas", (table) => {
      table.increments("id").primary();
      table.string("fecha");
      table.string("status");
      table.string("token");
      table.decimal("total", 10, 2);
      table.timestamp("created_at").defaultTo(db.fn.now());
    });
  }
});

// Crear la tabla de servicios si no existe
db.schema.hasTable("servicios").then((exists) => {
  if (!exists) {
    return db.schema.createTable("servicios", (table) => {
      table.increments("id").primary();
      table.integer("reserva_id").unsigned().references("id").inTable("reservas").onDelete("CASCADE");
      table.string("nombre");
      table.string("subtipo").nullable();
      table.string("atributo").nullable();
      table.string("valor").nullable();
      table.string("tamaño").nullable();
    });
  }
});

export default db;