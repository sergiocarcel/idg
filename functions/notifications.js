const { onDocumentCreated } = require("firebase-functions/v2/firestore");
const { getMessaging } = require("firebase-admin/messaging");
const { getFirestore } = require("firebase-admin/firestore");

const TIPO_TITLES = {
  alerta: "⚠️ Alerta",
  info: "ℹ️ Información",
  exito: "✅ Éxito",
  aviso: "⏰ Aviso",
};

exports.onNotificacionCreated = onDocumentCreated(
  "notificaciones/{id}",
  async (event) => {
    const notif = event.data?.data();
    if (!notif) return;

    const destinatarios = notif.destinatarios || [];
    if (destinatarios.length === 0) return;

    const db = getFirestore();
    const snaps = await Promise.all(
      destinatarios.map((email) =>
        db.collection("fcmTokens").doc(email).get()
      )
    );

    const tokensByEmail = {};
    snaps.forEach((snap, i) => {
      const tokens = snap.data()?.tokens || [];
      if (tokens.length > 0) tokensByEmail[destinatarios[i]] = tokens;
    });

    const allTokens = Object.values(tokensByEmail).flat();
    if (allTokens.length === 0) return;

    const title = TIPO_TITLES[notif.tipo] || "Notificación CRM";
    const response = await getMessaging().sendEachForMulticast({
      tokens: allTokens,
      notification: { title, body: notif.mensaje },
      data: { link: notif.link || "/" },
      webpush: {
        notification: { icon: "/logoIDG.jpg", badge: "/logoIDG.jpg" },
        fcmOptions: { link: notif.link || "/" },
      },
    });

    // Collect invalid tokens across all recipients
    const invalidTokens = new Set();
    response.responses.forEach((res, i) => {
      if (!res.success) {
        const code = res.error?.code;
        if (
          code === "messaging/registration-token-not-registered" ||
          code === "messaging/invalid-registration-token"
        ) {
          invalidTokens.add(allTokens[i]);
        }
      }
    });

    if (invalidTokens.size === 0) return;

    // Remove invalid tokens from each affected user doc
    const batch = db.batch();
    for (const [email, tokens] of Object.entries(tokensByEmail)) {
      const cleaned = tokens.filter((t) => !invalidTokens.has(t));
      if (cleaned.length !== tokens.length) {
        batch.update(db.collection("fcmTokens").doc(email), {
          tokens: cleaned,
          updatedAt: new Date().toISOString(),
        });
      }
    }
    await batch.commit();
  }
);
