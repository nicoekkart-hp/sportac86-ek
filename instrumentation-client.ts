import { initBotId } from "botid/client/core";

initBotId({
  protect: [
    { path: "/api/registrations", method: "POST" },
    { path: "/api/orders", method: "POST" },
    { path: "/api/checkout/bestelling", method: "POST" },
    { path: "/api/checkout/inschrijving", method: "POST" },
    { path: "/sponsors", method: "POST" },
  ],
});
