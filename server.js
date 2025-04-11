import express from "express";
import cors from "cors";
import { MercadoPagoConfig, Preference, Payment } from "mercadopago";
import db from "./db.js";
import dotenv from "dotenv";
import { enviarMailDeConfirmacion } from "./mailer.js";
import crypto from "crypto";
import path from "path";
const __dirname = path.resolve();
const PORT = process.env.PORT || 3001;

dotenv.config();
const API_URL = "https://blak-backend.onrender.com";
const app = express();

app.use(cors());
app.use(express.json());

const client = new MercadoPagoConfig({ accessToken: "APP_USR-7045728362832938-040422-b215197905b892d79ce5a4013a7f1fb5-2370696918" });

app.post("/create_preference", async (req, res) => {
  const preference = new Preference(client);

  try {
    const response = await preference.create({
      body: {
        items: [
          {
            title: req.body.description,
            quantity: 1,
            unit_price: req.body.transaction_amount,
          },
        ],
        payer: req.body.payer,
        notification_url: `${API_URL}/webhook`,
        back_urls: {
          success: `${API_URL}/success`,
          failure: `${API_URL}/fail`,
          pending: `${API_URL}/`,
        },
        auto_return: "approved",
      },
    });

    res.status(200).json({ init_point: response.init_point });
  } catch (error) {
    console.error("Error al crear preferencia:", error);
    res.status(400).json(error);
  }
});

// webhook MP
app.post("/webhook", async (req, res) => {
  const paymentInsta = new Payment(client);
  const payment = req.body;

  if (payment?.type === "payment") {
    try {
      const mpPayment = await paymentInsta.get({ id: payment.data.id });
      const status = mpPayment.api_response.status;

      if (status == "200") {
        const rawDesc = mpPayment.additional_info?.items?.[0]?.title || "";
        const email = "nicolasgomez94@gmail.com"; // hardcoded por ahora
        const token = crypto.randomBytes(16).toString("hex");

        let fecha = "";
        let servicios = [];

        try {
          const parsed = JSON.parse(rawDesc);
          fecha = parsed.fecha;
          servicios = parsed.servicios;
        } catch (err) {
          console.error("❌ No se pudo parsear la descripción:", rawDesc);
        }

        if (fecha) {
          const reservasEnEseDia = await db("reservas")
            .where({ fecha })
            .count("id as total");
          const cantidad = reservasEnEseDia[0].total;

          if (cantidad >= 10) {
            console.warn(
              `❌ Día ${fecha} ya tiene el cupo completo. No se guarda la reserva.`
            );
            return res.sendStatus(200);
          }

          // Insertar reserva
          const reservaId = await db("reservas").insert({
            fecha,
            status,
            token,
            total: servicios.reduce((sum, servicio) => sum + (servicio.precio || 0), 0), // Calculate total
          });

          // Insertar servicios asociados
          for (const servicio of servicios) {
            for (const [atributo, valor] of Object.entries(servicio)) {
              if (atributo !== "nombre" && atributo !== "tamaño") {
                await db("servicios").insert({
                  reserva_id: reservaId[0], // Link to the reservation
                  nombre: servicio.nombre,
                  atributo,
                  valor,
                  tamaño: servicio.tamaño,
                });
              }
            }
          }

          await enviarMailDeConfirmacion({ to: email, fecha });
          console.log(`✅ Reserva guardada para ${fecha}`);
        } else {
          console.log("❌ Fecha no válida, no se guardó la reserva.");
        }
      } else {
        console.log("❌ Error de red -->", status);
      }
    } catch (error) {
      console.error("❌ Error al procesar webhook:", error);
    }
  }

  res.sendStatus(200);
});

app.post("/webhook", (req, res) => {
  console.log("📩 Notificación recibida de Mercado Pago:", req.body);
  res.sendStatus(200);
});

// reservas guardadas
app.get("/reservas", async (req, res) => {
  const reservas = await db("reservas").select();
  res.json(reservas);
});

app.delete("/reservas/:id", async (req, res) => {
  try {
    const { id } = req.params;
    await db("reservas").where("id", id).del();
    res.status(200).json({ success: true });
  } catch (error) {
    console.error("Error al eliminar reserva:", error);
    res.status(500).json({ success: false, error: "No se pudo eliminar la reserva." });
  }
});

app.get("/servicios/:reservaId", async (req, res) => {
  const { reservaId } = req.params;
  try {
    const servicios = await db("servicios").where({ reserva_id: reservaId });
    res.json(servicios);
  } catch (error) {
    console.error("Error al obtener los servicios:", error);
    res.status(500).json({ error: "No se pudieron obtener los servicios." });
  }
});

app.put("/reservas/:id", async (req, res) => {
  const { id } = req.params;
  const updatedReserva = req.body;

  try {
    await db("reservas").where("id", id).update(updatedReserva);
    res.status(200).json({ success: true });
  } catch (error) {
    console.error("Error al actualizar la reserva:", error);
    res.status(500).json({ success: false, error: "No se pudo actualizar la reserva." });
  }
});

app.put("/servicios/:id", async (req, res) => {
  const { id } = req.params;
  const updatedServicio = req.body;

  try {
    await db("servicios").where("id", id).update(updatedServicio);
    res.status(200).json({ success: true });
  } catch (error) {
    console.error("Error al actualizar el servicio:", error);
    res.status(500).json({ success: false, error: "No se pudo actualizar el servicio." });
  }
});

//RENDER
app.listen(PORT, "0.0.0.0", () => {
  console.log(`Servidor corriendo en http://0.0.0.0:${PORT}`);
});
