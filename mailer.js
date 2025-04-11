import nodemailer from "nodemailer";
import dotenv from "dotenv";

dotenv.config();

const transporter = nodemailer.createTransport({
	host: "smtp.gmail.com",
	port: 587,
	secure: false,
	auth: {
		user: "nicolasgomez94@gmail.com",
		pass: "wgopqowjajyslalj"
	}
});

export const enviarMailDeConfirmacion = async ({ to, fecha, hora }) => {
	const info = await transporter.sendMail({
		from: `"BLAK" <nicolasgomez94@gmail.com>`,
		to,
		subject: "Confirmación de tu reserva",
		html: `
			<div style="font-family: sans-serif; color: #333;">
				<h2>¡Gracias por tu reserva en <span style="color: #007bff;">BLAK</span>!</h2>
				<p>Confirmamos tu turno para el <strong>${fecha}</strong> a las <strong>${hora} hs</strong>.</p>
				<p>📍 Dirección: Av. Ejemplo 1234, CABA<br />
				📞 WhatsApp: 11 1234 5678</p>
				<hr />
				<p style="font-size: 12px; color: #888;">Si este turno no fue reservado por vos, simplemente ignorá este mensaje.</p>
			</div>
		`
	});

	console.log("📧 Mail enviado:", info.messageId);
};
